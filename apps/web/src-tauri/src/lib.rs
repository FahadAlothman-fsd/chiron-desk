#[tauri::command]
async fn pick_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    use rfd::FileDialog;
    
    log::info!("pick_folder command called with default_path: {:?}", default_path);
    
    let mut dialog = FileDialog::new();
    
    // Set title
    dialog = dialog.set_title("Select Folder");
    
    // Set default directory if provided
    if let Some(path) = default_path {
        if let Ok(canonical) = std::fs::canonicalize(&path) {
            dialog = dialog.set_directory(canonical);
        }
    }
    
    // Pick folder - this will properly use GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER
    let result = dialog.pick_folder();
    
    log::info!("pick_folder result: {:?}", result);
    
    Ok(result.map(|p| p.to_string_lossy().to_string()))
}

#[derive(serde::Serialize)]
struct PathValidationResult {
    valid: bool,
    exists: bool,
    is_directory: bool,
    is_empty: bool,
    error: Option<String>,
}

#[tauri::command]
async fn validate_directory_path(path: String, must_exist: bool, must_be_empty: bool) -> Result<PathValidationResult, String> {
    use std::path::Path;
    use std::fs;
    
    log::info!("validate_directory_path called with path: {:?}, must_exist: {}, must_be_empty: {}", path, must_exist, must_be_empty);
    
    let path_obj = Path::new(&path);
    
    // Check if path exists
    let exists = path_obj.exists();
    
    // If must exist but doesn't, return error
    if must_exist && !exists {
        return Ok(PathValidationResult {
            valid: false,
            exists: false,
            is_directory: false,
            is_empty: false,
            error: Some("Directory does not exist".to_string()),
        });
    }
    
    // If doesn't exist and doesn't need to exist, check if parent is writable
    if !exists && !must_exist {
        // Check if parent directory exists and is writable
        if let Some(parent) = path_obj.parent() {
            if !parent.exists() {
                return Ok(PathValidationResult {
                    valid: false,
                    exists: false,
                    is_directory: false,
                    is_empty: false,
                    error: Some(format!("Parent directory does not exist: {}", parent.display())),
                });
            }
            
            // Try to check if we can write to parent
            match parent.metadata() {
                Ok(_) => {
                    // Parent exists and is accessible
                    return Ok(PathValidationResult {
                        valid: true,
                        exists: false,
                        is_directory: false,
                        is_empty: true, // Doesn't exist yet, so will be empty when created
                        error: None,
                    });
                }
                Err(e) => {
                    return Ok(PathValidationResult {
                        valid: false,
                        exists: false,
                        is_directory: false,
                        is_empty: false,
                        error: Some(format!("Cannot access parent directory: {}", e)),
                    });
                }
            }
        } else {
            return Ok(PathValidationResult {
                valid: false,
                exists: false,
                is_directory: false,
                is_empty: false,
                error: Some("Invalid path: no parent directory".to_string()),
            });
        }
    }
    
    // If exists, check if it's a directory
    let is_directory = path_obj.is_dir();
    if exists && !is_directory {
        return Ok(PathValidationResult {
            valid: false,
            exists: true,
            is_directory: false,
            is_empty: false,
            error: Some("Path exists but is not a directory".to_string()),
        });
    }
    
    // If must be empty, check contents
    let mut is_empty = false;
    if exists && is_directory {
        match fs::read_dir(path_obj) {
            Ok(entries) => {
                is_empty = entries.count() == 0;
                if must_be_empty && !is_empty {
                    return Ok(PathValidationResult {
                        valid: false,
                        exists: true,
                        is_directory: true,
                        is_empty: false,
                        error: Some("Directory is not empty".to_string()),
                    });
                }
            }
            Err(e) => {
                return Ok(PathValidationResult {
                    valid: false,
                    exists: true,
                    is_directory: true,
                    is_empty: false,
                    error: Some(format!("Cannot read directory: {}", e)),
                });
            }
        }
    }
    
    Ok(PathValidationResult {
        valid: true,
        exists,
        is_directory,
        is_empty,
        error: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![pick_folder, validate_directory_path])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
