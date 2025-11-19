# Story 1.5 - Tauri Integration for Native Folder Picker

## Summary

Added Tauri desktop app support for native folder selection with automatic detection between web and desktop environments.

---

## Changes Made

### 1. Frontend Component (`apps/web/src/components/workflows/steps/ask-user-step.tsx`)

**Added Tauri Detection:**
```typescript
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
```

**Dual-mode Folder Selection:**
- **Desktop (Tauri):** Uses native OS dialog via `@tauri-apps/plugin-dialog`
- **Web Browser:** Falls back to HTML5 `<input type="file" webkitdirectory>`

**Implementation:**
```typescript
if (isTauri) {
  // Native Tauri dialog - returns full absolute path
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
  });
  setValue(selected); // Full path like /home/user/projects/my-app
} else {
  // Web fallback - limited to folder name only
  input.webkitdirectory = true;
  // Returns only folder name, user must type full path
}
```

**UI Updates:**
- Dynamic helper text based on environment
- Desktop: "Click Browse to select a folder or enter the path manually"
- Web: "Enter the complete path. The Browse button can help you find the folder, but you must type the full path (web browser limitation)"

---

### 2. Package Installation

**Added NPM Package:**
```bash
bun add @tauri-apps/plugin-dialog
```

**Location:** `apps/web/package.json`

---

### 3. Tauri Backend Configuration

**Updated `apps/web/src-tauri/Cargo.toml`:**
```toml
[dependencies]
tauri-plugin-dialog = "2"
```

**Updated `apps/web/src-tauri/src/lib.rs`:**
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init()) // Added this line
    .setup(|app| {
      // existing setup code
    })
```

---

## How It Works

### Desktop App (Tauri)

1. User clicks "Browse" button
2. Native OS folder picker opens (no "Upload" prompt)
3. User selects folder
4. **Full absolute path** returned: `/home/user/projects/my-app`
5. Path populated in input field
6. User clicks Continue
7. Backend validates path

### Web App (Browser)

1. User clicks "Browse" button
2. Browser file picker opens (shows "Upload" due to security)
3. User selects folder
4. **Only folder name** returned: `my-app`
5. Validation error shown: "Please enter the complete path to this folder"
6. User types full path manually: `/home/user/projects/my-app`
7. User clicks Continue
8. Backend validates path

---

## Testing Instructions

### Test Desktop App (Tauri)

```bash
cd apps/web
bun run desktop:dev
```

**Expected Behavior:**
1. Create new project
2. Select initializer
3. Click Continue on Step 1
4. On Step 2, click "Browse"
5. Native OS folder picker opens (clean, no "Upload" prompt)
6. Select a folder
7. **Full path** appears in input field
8. Click Continue
9. Step 2 completes successfully

### Test Web App (Browser)

```bash
cd apps/web
bun run dev
```

Navigate to http://localhost:3001

**Expected Behavior:**
1. Create new project
2. Select initializer
3. Click Continue on Step 1
4. On Step 2, click "Browse"
5. Browser file picker opens (shows "Upload" warning)
6. Select a folder
7. **Only folder name** appears with error message
8. Manually type full path
9. Click Continue
10. Step 2 completes successfully

---

## Files Modified

1. **`apps/web/src/components/workflows/steps/ask-user-step.tsx`**
   - Added Tauri detection
   - Dual-mode folder selection (Tauri vs Web)
   - Dynamic helper text

2. **`apps/web/package.json`**
   - Added `@tauri-apps/plugin-dialog` dependency

3. **`apps/web/src-tauri/Cargo.toml`**
   - Added `tauri-plugin-dialog = "2"` dependency

4. **`apps/web/src-tauri/src/lib.rs`**
   - Initialized dialog plugin

---

## Benefits

✅ **Desktop App:** Full native folder picker experience with complete paths  
✅ **Web App:** Graceful fallback with clear user guidance  
✅ **Automatic Detection:** Single codebase works for both environments  
✅ **No Code Duplication:** Same component handles both modes  
✅ **Clear UX:** Helper text adapts to environment capabilities  

---

## Limitations

### Web Browser Limitations (Security)
- Browsers don't expose full filesystem paths
- `webkitdirectory` only returns relative paths within selected folder
- Users must manually type complete path
- "Upload" dialog text is unavoidable (browser security model)

### Desktop App Benefits
- Native OS folder picker (no "Upload" text)
- Returns full absolute path
- Better UX and user confidence

---

## Future Enhancements

1. **Path Validation UI:** Show checkmarks/errors as user types path
2. **Recent Paths:** Remember last used paths
3. **Path Autocomplete:** Suggest paths based on user history
4. **Drag & Drop:** Allow dragging folders into input (Tauri only)

---

## Environment Detection Logic

```typescript
// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
```

**How it works:**
- Tauri injects `window.__TAURI__` object at runtime
- Web browsers don't have this object
- Safe to check without errors
- Used for both UI rendering and behavior branching

---

## Status

✅ **Desktop App Support:** Fully implemented and ready to test  
✅ **Web App Fallback:** Working with user guidance  
✅ **Documentation:** Complete  
⏳ **Testing:** Ready for Fahad to test desktop app  

---

## Notes

- The Tauri app will need to be built/run separately with `bun run desktop:dev`
- Web app continues to work normally with `bun run dev`
- Both share the same codebase with automatic environment detection
- No build flags or configuration needed - detection is runtime
