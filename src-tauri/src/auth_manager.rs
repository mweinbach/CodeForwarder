use crate::types::*;
use chrono::Utc;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

pub fn get_auth_dir() -> PathBuf {
    let base_dir = dirs::home_dir()
        .or_else(dirs::data_local_dir)
        .unwrap_or_else(std::env::temp_dir);
    let dir = base_dir.join(".cli-proxy-api");
    if !dir.exists() {
        fs::create_dir_all(&dir).ok();
    }
    dir
}

pub fn scan_auth_directory() -> HashMap<ServiceType, ServiceAccounts> {
    let mut result: HashMap<ServiceType, ServiceAccounts> = HashMap::new();

    // Initialize empty ServiceAccounts for all service types
    for st in ServiceType::all() {
        result.insert(
            *st,
            ServiceAccounts {
                service_type: *st,
                accounts: Vec::new(),
                active_count: 0,
                expired_count: 0,
            },
        );
    }

    let auth_dir = get_auth_dir();
    let entries = match fs::read_dir(&auth_dir) {
        Ok(e) => e,
        Err(_) => return result,
    };

    let now = Utc::now();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let file_path_str = path.to_string_lossy().to_string();
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let contents = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let json: serde_json::Value = match serde_json::from_str(&contents) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let type_str = match json.get("type").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => continue,
        };

        let service_type = match ServiceType::from_str_loose(type_str) {
            Some(st) => st,
            None => continue,
        };

        let email = json.get("email").and_then(|v| v.as_str()).map(String::from);
        let login = json.get("login").and_then(|v| v.as_str()).map(String::from);
        let expired = json
            .get("expired")
            .and_then(|v| v.as_str())
            .map(String::from);

        let is_expired = expired
            .as_ref()
            .map(|exp_str| {
                // Try with fractional seconds first, then without
                chrono::DateTime::parse_from_rfc3339(exp_str)
                    .or_else(|_| {
                        chrono::NaiveDateTime::parse_from_str(exp_str, "%Y-%m-%dT%H:%M:%S").map(
                            |naive| {
                                naive
                                    .and_local_timezone(chrono::Utc)
                                    .single()
                                    .unwrap_or_else(chrono::Utc::now)
                                    .fixed_offset()
                            },
                        )
                    })
                    .map(|dt| dt < now)
                    .unwrap_or(false)
            })
            .unwrap_or(false);

        let display_name = if let Some(email_val) = email.as_ref().filter(|e| !e.is_empty()) {
            email_val.clone()
        } else if let Some(login_val) = login.as_ref().filter(|l| !l.is_empty()) {
            login_val.clone()
        } else {
            file_name.clone()
        };

        let account = AuthAccount {
            id: file_name,
            email,
            login,
            service_type,
            expired,
            is_expired,
            file_path: file_path_str,
            display_name,
        };

        if let Some(sa) = result.get_mut(&service_type) {
            if is_expired {
                sa.expired_count += 1;
            } else {
                sa.active_count += 1;
            }
            sa.accounts.push(account);
        }
    }

    result
}

pub fn delete_account(file_path: &str) -> Result<(), String> {
    let target = Path::new(file_path);
    delete_account_impl(&get_auth_dir(), target)
}

fn delete_account_impl(auth_dir: &Path, target: &Path) -> Result<(), String> {
    let auth_dir = fs::canonicalize(auth_dir)
        .map_err(|e| format!("Failed to resolve auth directory: {}", e))?;

    if target.extension().and_then(|ext| ext.to_str()) != Some("json") {
        return Err("Only .json auth files can be deleted".to_string());
    }

    let canonical_target = fs::canonicalize(target)
        .map_err(|e| format!("Failed to resolve target file path: {}", e))?;

    if !canonical_target.starts_with(&auth_dir) {
        return Err("Refusing to delete files outside auth directory".to_string());
    }

    match fs::remove_file(&canonical_target) {
        Ok(()) => Ok(()),
        Err(err) => {
            // Windows refuses to delete read-only files. Clear the attribute and retry once.
            // On Unix this is generally unnecessary but harmless if we can set permissions.
            if err.kind() == std::io::ErrorKind::PermissionDenied {
                if let Ok(meta) = fs::metadata(&canonical_target) {
                    let mut perms = meta.permissions();
                    if perms.readonly() {
                        perms.set_readonly(false);
                        let _ = fs::set_permissions(&canonical_target, perms);
                        if fs::remove_file(&canonical_target).is_ok() {
                            return Ok(());
                        }
                    }
                }
            }

            Err(format!("Failed to delete account file: {}", err))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn make_temp_auth_dir() -> (PathBuf, PathBuf) {
        let base = std::env::temp_dir().join(format!(
            "codeforwarder-auth-manager-test-{}",
            uuid::Uuid::new_v4()
        ));
        let auth_dir = base.join(".cli-proxy-api");
        fs::create_dir_all(&auth_dir).expect("Failed to create temp auth dir");
        (base, auth_dir)
    }

    #[test]
    fn delete_account_removes_auth_json_file() {
        let (base, auth_dir) = make_temp_auth_dir();
        let file_path = auth_dir.join("test.json");
        fs::write(&file_path, "{}").expect("Failed to write auth file");

        delete_account_impl(&auth_dir, &file_path).expect("delete_account failed");
        assert!(!file_path.exists(), "auth file should be deleted");

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn delete_account_refuses_outside_auth_dir() {
        let (base, auth_dir) = make_temp_auth_dir();
        let outside = base.join("outside.json");
        fs::write(&outside, "{}").expect("Failed to write outside file");

        let err = delete_account_impl(&auth_dir, &outside).unwrap_err();
        assert!(
            err.contains("outside auth directory"),
            "unexpected error: {}",
            err
        );

        // Ensure we didn't delete it by mistake.
        assert!(outside.exists(), "outside file should not be deleted");

        // Sanity: still inside auth dir should be allowed.
        let inside = auth_dir.join("inside.json");
        fs::write(&inside, "{}").expect("Failed to write inside file");
        delete_account_impl(&auth_dir, &inside).expect("delete_account failed for inside");

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn delete_account_rejects_non_json_extension() {
        let (base, auth_dir) = make_temp_auth_dir();
        let file_path = auth_dir.join("not-json.txt");
        fs::write(&file_path, "hello").expect("Failed to write non-json file");

        let err = delete_account_impl(&auth_dir, &file_path).unwrap_err();
        assert!(err.contains("Only .json"), "unexpected error: {}", err);

        assert!(file_path.exists(), "non-json file should remain");

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn delete_account_clears_readonly_and_deletes() {
        let (base, auth_dir) = make_temp_auth_dir();
        let file_path = auth_dir.join("readonly.json");
        fs::write(&file_path, "{}").expect("Failed to write auth file");

        let mut perms = fs::metadata(&file_path)
            .expect("Failed to stat auth file")
            .permissions();
        perms.set_readonly(true);
        fs::set_permissions(&file_path, perms).expect("Failed to set readonly");

        // On Unix, deletion succeeds even when the file is readonly; on Windows we rely on the
        // fallback path in delete_account to clear the attribute first.
        delete_account_impl(&auth_dir, &file_path).expect("delete_account failed");
        assert!(!file_path.exists(), "readonly auth file should be deleted");

        let _ = fs::remove_dir_all(&base);
    }
}
