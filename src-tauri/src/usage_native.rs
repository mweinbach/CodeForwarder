use crate::managed_key;
use crate::types::{NativeUsagePanel, NativeUsageRow, NativeUsageSummary};
use crate::usage_tracker::{UsageRangeQuery, UsageTracker};
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION};
use serde_json::Value;
use std::sync::OnceLock;
use std::time::Duration;

const NATIVE_REFRESH_TTL_SECS: i64 = 60;

pub async fn get_native_panel(
    tracker: &UsageTracker,
    range: UsageRangeQuery,
    force_refresh: bool,
) -> NativeUsagePanel {
    let range_key = range.as_key().to_string();
    let effective_range = if matches!(range, UsageRangeQuery::AllTime) {
        "30d".to_string()
    } else {
        range_key.clone()
    };

    let cached = tracker.load_native_snapshot(&range_key).await.ok().flatten();
    let cached_is_fresh = cached
        .as_ref()
        .and_then(|record| record.synced_ts)
        .map(|ts| Utc::now().timestamp() - ts <= NATIVE_REFRESH_TTL_SECS)
        .unwrap_or(false);

    if !force_refresh && cached_is_fresh {
        let mut panel = cached.map(|record| record.panel).unwrap_or_else(|| {
            make_unavailable_panel(
                &effective_range,
                "Native usage has not been fetched yet.".to_string(),
            )
        });
        if matches!(range, UsageRangeQuery::AllTime) {
            panel.message = Some(match panel.message {
                Some(msg) => format!("{} Native panel is currently clamped to 30d.", msg),
                None => "Native panel is currently clamped to 30d.".to_string(),
            });
        }
        return panel;
    }

    let fetch_result = fetch_and_parse_native_usage(&effective_range).await;
    match fetch_result {
        Ok(mut panel) => {
            if matches!(range, UsageRangeQuery::AllTime) {
                panel.message = Some(match panel.message {
                    Some(msg) => format!("{} Native panel is currently clamped to 30d.", msg),
                    None => "Native panel is currently clamped to 30d.".to_string(),
                });
            }
            if let Err(e) = tracker.save_native_snapshot(&range_key, &panel).await {
                log::warn!("[UsageNative] Failed to persist native usage snapshot: {}", e);
            }
            panel
        }
        Err(err) => {
            if let Some(record) = cached {
                let mut panel = record.panel;
                panel.status = "stale".to_string();
                panel.message = Some(format!(
                    "Native refresh failed: {}. Showing most recent snapshot.",
                    err
                ));
                if matches!(range, UsageRangeQuery::AllTime) {
                    panel.message = Some(match panel.message {
                        Some(msg) => format!("{} Native panel is currently clamped to 30d.", msg),
                        None => "Native panel is currently clamped to 30d.".to_string(),
                    });
                }
                panel
            } else {
                let mut panel = make_unavailable_panel(
                    &effective_range,
                    format!("Native usage is unavailable: {}", err),
                );
                if matches!(range, UsageRangeQuery::AllTime) {
                    panel.message = Some(match panel.message {
                        Some(msg) => format!("{} Native panel is currently clamped to 30d.", msg),
                        None => "Native panel is currently clamped to 30d.".to_string(),
                    });
                }
                if let Err(e) = tracker.save_native_snapshot(&range_key, &panel).await {
                    log::warn!("[UsageNative] Failed to persist unavailable snapshot: {}", e);
                }
                panel
            }
        }
    }
}

fn make_unavailable_panel(effective_range: &str, message: String) -> NativeUsagePanel {
    NativeUsagePanel {
        status: "unavailable".to_string(),
        effective_range: effective_range.to_string(),
        message: Some(message),
        summary: None,
        rows: Vec::new(),
        last_synced_at: Some(Utc::now().to_rfc3339()),
    }
}

fn shared_http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(3))
            .read_timeout(Duration::from_secs(8))
            .build()
            .expect("Failed to build native usage HTTP client")
    })
}

async fn fetch_and_parse_native_usage(effective_range: &str) -> Result<NativeUsagePanel, String> {
    let key = managed_key::get_or_create_management_key()
        .map_err(|e| format!("Failed to load managed management key: {}", e))?;

    let endpoints = [
        format!("http://127.0.0.1:8318/v0/management/usage?range={effective_range}"),
        format!("http://127.0.0.1:8318/v0/management/usage?period={effective_range}"),
        "http://127.0.0.1:8318/v0/management/usage".to_string(),
    ];

    let mut last_error = "No response from native usage endpoint".to_string();
    for endpoint in endpoints {
        for headers in auth_header_variants(&key) {
            match shared_http_client().get(&endpoint).headers(headers).send().await {
                Ok(resp) => {
                    let status = resp.status();
                    if !status.is_success() {
                        last_error = format!("{} returned HTTP {}", endpoint, status.as_u16());
                        continue;
                    }
                    let text = resp
                        .text()
                        .await
                        .map_err(|e| format!("Failed to read native usage response body: {}", e))?;
                    let payload: Value = serde_json::from_str(&text).map_err(|e| {
                        format!("Failed to parse native usage response JSON: {}", e)
                    })?;
                    return Ok(parse_native_payload(payload, effective_range));
                }
                Err(err) => {
                    last_error = format!("{} request failed: {}", endpoint, err);
                }
            }
        }
    }

    Err(last_error)
}

fn auth_header_variants(key: &str) -> Vec<HeaderMap> {
    let mut variants = Vec::new();

    let mut bearer = HeaderMap::new();
    if let Ok(value) = HeaderValue::from_str(&format!("Bearer {}", key)) {
        bearer.insert(AUTHORIZATION, value);
        variants.push(bearer);
    }

    for name in ["x-management-secret", "x-secret-key", "x-api-key"] {
        let mut headers = HeaderMap::new();
        if let (Ok(header_name), Ok(value)) = (
            HeaderName::from_lowercase(name.as_bytes()),
            HeaderValue::from_str(key),
        ) {
            headers.insert(header_name, value);
            variants.push(headers);
        }
    }

    variants
}

fn parse_native_payload(payload: Value, effective_range: &str) -> NativeUsagePanel {
    let total_requests = find_first_i64_for_keys(
        &payload,
        &["total_requests", "request_count", "requests", "totalRequests"],
    )
    .unwrap_or(0);
    let total_tokens =
        find_first_i64_for_keys(&payload, &["total_tokens", "tokens", "token_count", "totalTokens"])
            .unwrap_or(0);

    let mut rows = find_rows(&payload);
    if rows.is_empty() && (total_requests > 0 || total_tokens > 0) {
        rows.push(NativeUsageRow {
            source: "native".to_string(),
            model: "all-models".to_string(),
            auth_index: None,
            requests: total_requests,
            tokens: total_tokens,
        });
    }

    NativeUsagePanel {
        status: "ok".to_string(),
        effective_range: effective_range.to_string(),
        message: None,
        summary: Some(NativeUsageSummary {
            total_requests,
            total_tokens,
        }),
        rows,
        last_synced_at: Some(Utc::now().to_rfc3339()),
    }
}

fn find_rows(payload: &Value) -> Vec<NativeUsageRow> {
    let arrays = [
        "rows",
        "items",
        "models",
        "model_usage",
        "usage_by_model",
        "by_model",
    ];
    for key in arrays {
        if let Some(Value::Array(values)) = find_value_by_key(payload, key) {
            let mut rows = Vec::new();
            for value in values {
                if let Some(obj) = value.as_object() {
                    let model = find_string_in_object(obj, &["model", "model_name", "name"])
                        .unwrap_or_else(|| "unknown".to_string());
                    let source =
                        find_string_in_object(obj, &["source", "provider", "type"]).unwrap_or_else(
                            || "native".to_string(),
                        );
                    let auth_index = find_string_in_object(
                        obj,
                        &["auth_index", "account_index", "authIndex", "accountIndex"],
                    );
                    let requests = find_i64_in_object(obj, &["requests", "request_count", "count"])
                        .unwrap_or(0);
                    let tokens = find_i64_in_object(
                        obj,
                        &["total_tokens", "tokens", "token_count", "totalTokens"],
                    )
                    .unwrap_or(0);
                    rows.push(NativeUsageRow {
                        source,
                        model,
                        auth_index,
                        requests,
                        tokens,
                    });
                }
            }
            if !rows.is_empty() {
                return rows;
            }
        }
    }
    Vec::new()
}

fn find_string_in_object(
    obj: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Option<String> {
    for key in keys {
        if let Some(value) = obj.get(*key) {
            if let Some(s) = value.as_str() {
                return Some(s.to_string());
            }
            if value.is_number() {
                return Some(value.to_string());
            }
        }
    }
    None
}

fn find_i64_in_object(obj: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<i64> {
    for key in keys {
        if let Some(value) = obj.get(*key) {
            if let Some(v) = as_i64(value) {
                return Some(v);
            }
        }
    }
    None
}

fn find_first_i64_for_keys(payload: &Value, keys: &[&str]) -> Option<i64> {
    for key in keys {
        if let Some(value) = find_value_by_key(payload, key) {
            if let Some(v) = as_i64(value) {
                return Some(v);
            }
        }
    }
    None
}

fn as_i64(value: &Value) -> Option<i64> {
    if let Some(v) = value.as_i64() {
        return Some(v);
    }
    if let Some(v) = value.as_u64() {
        return Some(v as i64);
    }
    if let Some(v) = value.as_f64() {
        return Some(v.round() as i64);
    }
    if let Some(s) = value.as_str() {
        if let Ok(v) = s.parse::<i64>() {
            return Some(v);
        }
    }
    None
}

fn find_value_by_key<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            if let Some(v) = map.get(key) {
                return Some(v);
            }
            for nested in map.values() {
                if let Some(found) = find_value_by_key(nested, key) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(items) => {
            for item in items {
                if let Some(found) = find_value_by_key(item, key) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}
