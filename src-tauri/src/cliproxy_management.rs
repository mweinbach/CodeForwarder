use crate::managed_key;
use crate::types::ProviderModelDefinitionsResponse;
use reqwest::header::{HeaderMap, HeaderValue};
use std::sync::OnceLock;
use std::time::Duration;

const MANAGEMENT_BASE_URL: &str = "http://127.0.0.1:8318";
const MANAGEMENT_TIMEOUT_SECS: u64 = 5;

fn shared_client() -> Result<&'static reqwest::Client, String> {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

    Ok(CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(MANAGEMENT_TIMEOUT_SECS))
            .timeout(Duration::from_secs(MANAGEMENT_TIMEOUT_SECS))
            .build()
            .expect("Failed to build reqwest client")
    }))
}

fn sanitize_channel(channel: &str) -> Result<String, String> {
    let trimmed = channel.trim();
    if trimmed.is_empty() {
        return Err("channel is required".to_string());
    }

    // Keep this strict to avoid weird path injection.
    for c in trimmed.chars() {
        let ok = c.is_ascii_alphanumeric() || c == '-' || c == '_';
        if !ok {
            return Err("channel contains invalid characters".to_string());
        }
    }

    Ok(trimmed.to_ascii_lowercase())
}

fn management_headers() -> Result<HeaderMap, String> {
    let key = managed_key::get_or_create_management_key()?;
    let mut headers = HeaderMap::new();
    headers.insert(
        "X-Management-Key",
        HeaderValue::from_str(&key).map_err(|_| "Invalid management key".to_string())?,
    );
    Ok(headers)
}

pub async fn fetch_provider_model_definitions(
    channel: &str,
) -> Result<ProviderModelDefinitionsResponse, String> {
    let channel = sanitize_channel(channel)?;
    let client = shared_client()?;
    let headers = management_headers()?;

    let url = format!(
        "{}/v0/management/model-definitions/{}",
        MANAGEMENT_BASE_URL, channel
    );

    let resp = client
        .get(url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("Failed to reach CLIProxy management API: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "CLIProxy management API error ({}): {}",
            status.as_u16(),
            body
        ));
    }

    resp.json::<ProviderModelDefinitionsResponse>()
        .await
        .map_err(|e| format!("Failed to parse model definitions: {}", e))
}
