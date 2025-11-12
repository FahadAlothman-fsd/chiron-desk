# Story 1.5 - Decoupled Directory Picker Component

## Overview

Created a reusable, decoupled `DirectoryPicker` component that handles both Tauri (native) and Web (browser) directory selection.

---

## Architecture

### Component Structure

```
apps/web/src/components/ui/
├── directory-picker.tsx     ← New reusable component
```

### Usage

```typescript
import { DirectoryPicker, DirectoryPickerHelp } from "@/components/ui/directory-picker";

<DirectoryPicker
  value={path}
  onChange={(path) => setPath(path)}
  onError={(error) => setError(error)}
  defaultPath="/home/user/projects"
  mode="directory"
  disabled={false}
/>
<DirectoryPickerHelp />
```

---

## Component API

### DirectoryPicker Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | *required* | Current path value |
| `onChange` | `(path: string) => void` | *required* | Callback when path changes |
| `onError` | `(error: string) => void` | `undefined` | Callback for errors (e.g., web browser limitations) |
| `placeholder` | `string` | `"/home/user/projects/my-project"` | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable input and browse button |
| `className` | `string` | `""` | Additional CSS classes |
| `defaultPath` | `string` | `undefined` | Starting directory for file picker |
| `mode` | `"file" \| "directory"` | `"directory"` | Select files or directories |

---

## Features

### ✅ Cross-Platform Support

**Tauri (Desktop):**
- Native OS file dialog
- Returns **full absolute path**
- Clean UX (no "Upload" text)
- Example: `/home/user/projects/my-app`

**Web (Browser):**
- HTML5 file input with `webkitdirectory`
- Returns **folder name only**
- Shows helper text about browser limitation
- Example: `my-app` (user must type full path)

---

### ✅ Automatic Environment Detection

```typescript
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
```

No configuration needed - component automatically uses the right implementation!

---

### ✅ Error Handling

```typescript
<DirectoryPicker
  onError={(error) => {
    // Handle errors like "Please enter the complete path to this folder"
    setValidationError(error);
  }}
/>
```

---

### ✅ Loading State

```typescript
<Button disabled={disabled || isOpening}>
  {isOpening ? "Opening..." : "Browse"}
</Button>
```

---

## Implementation Details

### Tauri Implementation

```typescript
const openTauriDialog = async () => {
  const { open } = await import("@tauri-apps/plugin-dialog");
  
  const selected = await open({
    directory: mode === "directory",
    multiple: false,
    defaultPath: defaultPath,
  });
  
  if (selected && typeof selected === "string") {
    onChange(selected); // Full path: /home/user/projects/my-app
  }
};
```

**Benefits:**
- ✅ Native OS dialog
- ✅ Full absolute path
- ✅ Better UX

---

### Web Implementation

```typescript
const openWebDialog = () => {
  const input = document.createElement("input");
  input.type = "file";
  
  if (mode === "directory") {
    input.webkitdirectory = true;
    input.multiple = true;
  }
  
  input.onchange = (e) => {
    const firstFile = target.files[0];
    const relativePath = firstFile.webkitRelativePath || firstFile.name;
    const folderName = relativePath.split("/")[0];
    
    onChange(folderName); // Folder name only: my-app
    onError?.("Please enter the complete path to this folder");
  };
  
  document.body.appendChild(input);
  input.click();
};
```

**Limitations:**
- ⚠️ Browser security prevents full path access
- ⚠️ Shows "Upload" text in dialog
- ⚠️ User must manually type full path

---

## DirectoryPickerHelp Component

Shows environment-specific help text:

```typescript
export function DirectoryPickerHelp() {
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  
  return (
    <p className="text-xs text-muted-foreground">
      {isTauri
        ? "Click Browse to select a folder or enter the path manually"
        : "Enter the complete path. The Browse button can help you find the folder, but you must type the full path (web browser limitation)"}
    </p>
  );
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { DirectoryPicker, DirectoryPickerHelp } from "@/components/ui/directory-picker";

function MyComponent() {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  
  return (
    <div className="space-y-2">
      <DirectoryPicker
        value={path}
        onChange={setPath}
        onError={setError}
      />
      <DirectoryPickerHelp />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
```

---

### With Validation

```typescript
function ValidatedPathPicker() {
  const [path, setPath] = useState("");
  const [validationError, setValidationError] = useState("");
  
  const validatePath = (newPath: string) => {
    if (!newPath) {
      setValidationError("Path is required");
      return;
    }
    
    if (!newPath.startsWith("/")) {
      setValidationError("Path must be absolute (start with /)");
      return;
    }
    
    setValidationError("");
    setPath(newPath);
  };
  
  return (
    <div className="space-y-2">
      <Label>Project Directory</Label>
      <DirectoryPicker
        value={path}
        onChange={validatePath}
        onError={(err) => setValidationError(err)}
        placeholder="/home/user/projects/my-project"
      />
      <DirectoryPickerHelp />
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

### File Selection (Instead of Directory)

```typescript
<DirectoryPicker
  value={filepath}
  onChange={setFilepath}
  mode="file"
  placeholder="/path/to/file.txt"
/>
```

---

## Integration with ask-user-step

**Before (Tightly Coupled):**
- 50+ lines of directory picker logic embedded in step component
- Hard to reuse
- Hard to test
- Mixed concerns

**After (Decoupled):**
```typescript
{config.responseType === "path" ? (
  <div className="space-y-2">
    <DirectoryPicker
      value={value}
      onChange={(path) => {
        setValue(path);
        setValidationError("");
      }}
      onError={(err) => setValidationError(err)}
      disabled={loading}
      defaultPath={config.pathConfig?.startPath}
      mode={config.pathConfig?.selectMode || "directory"}
    />
    <DirectoryPickerHelp />
  </div>
) : ...}
```

**Benefits:**
- ✅ Clean separation of concerns
- ✅ Reusable across the app
- ✅ Easy to test
- ✅ Single source of truth for directory picking

---

## Testing

### Test in Tauri

```bash
bun run dev:native
```

**Expected:**
1. Browse button opens native OS dialog
2. Select folder
3. Full path appears in input: `/home/user/projects/my-app`
4. Can submit immediately

---

### Test in Web

```bash
bun run dev:web
```

**Expected:**
1. Browse button opens browser file picker (shows "Upload")
2. Select folder
3. Folder name appears: `my-app`
4. Error message: "Please enter the complete path to this folder"
5. User types full path: `/home/user/projects/my-app`
6. Can submit

---

## Future Enhancements

### Potential Improvements

1. **Path Validation UI:**
   ```typescript
   <DirectoryPicker
     validate={(path) => validatePathExists(path)}
     showValidationStatus={true}
   />
   ```

2. **Recent Paths:**
   ```typescript
   <DirectoryPicker
     recentPaths={["/home/user/projects/app1", "/home/user/projects/app2"]}
     onSelectRecent={(path) => setPath(path)}
   />
   ```

3. **Drag & Drop (Tauri only):**
   ```typescript
   <DirectoryPicker
     allowDragDrop={true}
     onDrop={(path) => setPath(path)}
   />
   ```

4. **Path Autocomplete:**
   ```typescript
   <DirectoryPicker
     autocomplete={true}
     suggestions={getSuggestions(partialPath)}
   />
   ```

---

## Files Modified

### Created
1. **`apps/web/src/components/ui/directory-picker.tsx`**
   - New reusable component
   - ~140 lines
   - Handles Tauri + Web

### Updated
2. **`apps/web/src/components/workflows/steps/ask-user-step.tsx`**
   - Removed 50+ lines of embedded logic
   - Now uses `<DirectoryPicker>` component
   - Much cleaner and focused

---

## Benefits

### ✅ Reusability
Can be used anywhere in the app:
- Workflow steps
- Settings pages
- File import/export dialogs
- Project creation forms

### ✅ Maintainability
Single source of truth for directory picking logic

### ✅ Testability
Can test component in isolation

### ✅ Consistency
Same UX across the entire app

### ✅ Future-Proof
Easy to add features like drag-drop, autocomplete, validation

---

## Status

✅ **Component Created:** Fully decoupled and reusable  
✅ **Tauri Support:** Native dialog with full paths  
✅ **Web Support:** Browser fallback with helpful messaging  
✅ **Integrated:** Used in ask-user-step  
✅ **Documented:** Complete API and examples  
✅ **Ready:** Can be used anywhere in the app

---

## Usage Checklist

When you need directory/file selection:

1. ✅ Import the component:
   ```typescript
   import { DirectoryPicker, DirectoryPickerHelp } from "@/components/ui/directory-picker";
   ```

2. ✅ Add to your form:
   ```typescript
   <DirectoryPicker
     value={path}
     onChange={setPath}
     onError={setError}
   />
   ```

3. ✅ Add help text:
   ```typescript
   <DirectoryPickerHelp />
   ```

4. ✅ Handle validation as needed

That's it! The component handles all the Tauri vs Web complexity for you! 🎉
