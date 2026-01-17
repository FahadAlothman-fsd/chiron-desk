# Story 2.M7: Filesystem Field Type Enhancement

Status: done

## Story

As a **workflow designer**,
I want **enhanced directory selection and relative path inputs in user-form steps**,
so that **workflows can properly collect project paths and artifact output locations with appropriate validation**.

## Background

The frontend has a `DirectoryPicker` component using Tauri's native dialogs, but the backend `user-form-handler.ts` lacks full parity. Additionally, workflows need a way to collect relative paths (e.g., artifact output location within a repo) with proper validation.

## Deliverables

1. **Align backend `pathConfig` with frontend** — Add `selectMode`, `startPath` to backend interface

2. **Two-part directory input for new folders** — Inline component: `[📁 parent/ | new-folder-name]` where parent uses picker, name uses text input

3. **New `relative-path` field type** — Text input for paths within repo (e.g., `docs/artifacts`) with regex validation

## Use Cases Enabled

| Use Case | Input Type |
|----------|------------|
| Select existing project folder | Directory picker (single) |
| Create new project folder | Two-part inline input |
| Set artifact output location | Relative path text field |

## Acceptance Criteria

1. **Backend PathConfig Interface**
   - [x] Add `selectMode: "directory"` to `UserFormConfig.pathConfig`
   - [x] Add `startPath?: string` for default picker location
   - [x] Behavior switches based on `mustExist` value
   - [x] Export shared `PathConfig` type from `packages/api/src/services/workflow-engine/step-types.ts`

2. **Two-Part Directory Input Component** (`mustExist: false`)
   - [x] Inline component with two segments: prefix (picker) + suffix (text input)
   - [x] Prefix: parent path via native picker (must exist)
   - [x] Suffix: folder name via text input (regex validated)
   - [x] Preview/display of combined path
   - [x] Returns combined full path to backend
   - [x] Default state: prefix shows `~/` or last used path, suffix empty with placeholder

3. **Relative Path Field Type** (NEW)
   - [x] Add `responseType: "relative-path"` to user-form-handler
   - [x] Text input only (no native picker)
   - [x] Regex validation for safe path segments
   - [x] Rejects: `..` traversal, absolute paths, invalid chars (`<>:"|?*`), Windows reserved names
   - [x] Accepts: `docs`, `_bmad-output/planning`, `.chiron`, `.hidden-folder`

4. **Validation**
   - [x] Directory picker (existing): validates directory exists
   - [x] Directory picker (new): validates parent exists, folder name is valid
   - [x] Folder name regex: `/^\.?[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$/` (allows leading dot for hidden folders)
   - [x] Relative path regex: `/^(?!.*\.\.)(?!.*\/\/)(?!\/)(?!.*[<>:"|?*])[\.\w\-\/]+$/`
   - [x] Windows reserved names blocked: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`

5. **Error Handling UX**
   - [x] Show inline validation error below input field
   - [x] Red border on invalid input (use existing form error styles)
   - [x] Display context-appropriate error messages (see Error Messages table below)
   - [x] Integrate with react-hook-form validation (existing pattern in AskUserStep)

6. **Backward Compatibility**
   - [x] Existing `pathConfig: { mustExist: true }` still works
   - [x] Default `selectMode: "directory"` if not specified

## Validation Error Messages

### Two-Part Directory Input (folder name suffix)

| Validation | Error Message |
|------------|---------------|
| Empty | "Folder name is required" |
| Invalid start char | "Folder name must start with a letter, number, or dot" |
| Invalid chars | "Folder name cannot contain < > : \" \| ? *" |
| Windows reserved | "'{name}' is a reserved system name" |
| Too long | "Folder name is too long (max 255 characters)" |

### Two-Part Directory Input (parent prefix)

| Validation | Error Message |
|------------|---------------|
| Doesn't exist | "Parent directory does not exist" |
| Is a file | "Selected path is a file, not a directory" |
| No write permission | "Cannot create folder in this directory" |
| Folder already exists | "Folder '{name}' already exists in this location" |

### Relative Path Input

| Validation | Error Message |
|------------|---------------|
| Empty | "Path is required" |
| Contains `..` | "Path cannot contain '..' (directory traversal)" |
| Starts with `/` | "Path must be relative, not absolute" |
| Contains `//` | "Path cannot contain double slashes" |
| Invalid chars | "Path cannot contain < > : \" \| ? *" |
| Windows reserved | "Path contains reserved name '{name}'" |

### Directory Picker (existing folder - `mustExist: true`)

| Validation | Error Message |
|------------|---------------|
| Empty | "Please select a directory" |
| Doesn't exist | "Directory does not exist" |
| Is a file | "Selected path is a file, not a directory" |
| No permission | "Cannot access this directory" |

## Tasks / Subtasks

- [x] **Task 1: Backend Interface Update**
  - [x] 1.1 Extend `UserFormConfig.pathConfig` with `selectMode` and `startPath`
  - [x] 1.2 Add `responseType: "relative-path"` support
  - [x] 1.3 Export shared `PathConfig` type from `step-types.ts`

- [x] **Task 2: Validation Logic**
  - [x] 2.1 Update `validatePath` for directory mode
  - [x] 2.2 Add folder name validation (for two-part input) with hidden folder support
  - [x] 2.3 Add relative path validation with regex
  - [x] 2.4 Add Windows reserved name check utility
  - [x] 2.5 Implement all error messages from Error Messages table

- [x] **Task 3: Two-Part Directory Component** (Frontend)
  - [x] 3.1 Create inline two-segment input component (similar to shadcn URL/currency pattern)
  - [x] 3.2 Wire prefix to native directory picker (Tauri) with web fallback
  - [x] 3.3 Wire suffix to text input with validation
  - [x] 3.4 Add proper aria-labels and keyboard navigation
  - [x] 3.5 Integrate into `AskUserStep` when `mustExist: false`
  - [x] 3.6 Handle empty/default state (placeholder, initial value)
  - [x] 3.7 Display inline error messages below component

- [x] **Task 4: Relative Path Component** (Frontend)
  - [x] 4.1 Create or extend input for `responseType: "relative-path"`
  - [x] 4.2 Add client-side regex validation with react-hook-form
  - [x] 4.3 Show inline error messages below field
  - [x] 4.4 Integrate into `AskUserStep`

- [x] **Task 5: Seeds & Testing**
  - [x] 5.1 Update workflow-init seed with proper pathConfig (already correct)
  - [x] 5.2 Unit tests for directory validation (existing/new)
  - [x] 5.3 Unit tests for relative path validation
  - [x] 5.4 Unit tests for Windows reserved name blocking
  - [x] 5.5 Unit tests for hidden folder names (`.chiron`, `.vscode`)
  - [x] 5.6 Unit tests verifying correct error messages for each validation scenario

## Out of Scope

| Feature | Reason |
|---------|--------|
| File selection (`selectMode: "file"`) | No current workflow use case |
| File filters (`.yaml`, `.json`) | Comes with export/import feature (app-level) |
| Export/Import state | Separate Chiron app feature, different story |
| Full unicode folder name support | ASCII + common chars sufficient for now |

## Dev Notes

### Key Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/services/workflow-engine/step-handlers/user-form-handler.ts` | Add `selectMode`, `startPath`, relative-path validation |
| `packages/api/src/services/workflow-engine/step-types.ts` | Export shared `PathConfig` type |
| `apps/web/src/components/ui/directory-picker.tsx` | Add two-part mode variant |
| `apps/web/src/components/workflows/steps/ask-user-step.tsx` | Handle `mustExist: false` and `relative-path` |

### Validation Patterns

```typescript
// Folder name (for two-part input suffix) - allows .hidden folders
const FOLDER_NAME_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$/;

// Relative path (for artifact output) - allows .hidden at any level
const RELATIVE_PATH_REGEX = /^(?!.*\.\.)(?!.*\/\/)(?!\/)(?!.*[<>:"|?*])[\.\w\-\/]+$/;

// Windows reserved names (case-insensitive check)
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

// Max folder name length
const MAX_FOLDER_NAME_LENGTH = 255;
```

### Two-Part Input Visual

```
When mustExist: false (creating new folder):
┌────────────────────────────────────────────────┐
│ 📁 ~/projects/       │ my-new-project          │
└────────────────────────────────────────────────┘
       prefix                  input
   (picker on click)       (validated text)

Error state:
┌────────────────────────────────────────────────┐
│ 📁 ~/projects/       │ my<>project             │  ← red border
└────────────────────────────────────────────────┘
  ⚠️ Folder name cannot contain < > : " | ? *

When mustExist: true (selecting existing):
┌────────────────────────────────────────────────┐
│ 📁 /home/user/projects/chiron             [⋯] │
└────────────────────────────────────────────────┘
              single picker
```

### Platform Behavior

| Platform | Directory Picker | Fallback |
|----------|------------------|----------|
| Tauri (desktop) | Native OS dialog via `pick_folder` command | N/A |
| Web browser | Hidden `<input type="file" webkitdirectory>` | Manual text input |

The existing `DirectoryPicker` component already handles this - ensure two-part mode follows same pattern.

### Form Integration

The `AskUserStep` component uses react-hook-form. Follow existing pattern:

```tsx
// Existing pattern in ask-user-step.tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

// Validation errors display via form.formState.errors
// Use FormMessage component for inline error display
```

### Accessibility Requirements

For two-part input:
- `aria-label` on both segments ("Parent directory", "New folder name")
- Keyboard: Tab moves between segments, Enter on prefix opens picker
- Screen reader: Announce combined path on change
- Error messages linked via `aria-describedby`

### Architecture Decision: ADR-001

**Decision:** Directory-only selection, no file mode (YAGNI)

**Rationale:** 
- Only current use case is project directory selection
- File selection use case (export/import) is app-level feature, not workflow step
- Add file mode when real workflow use case emerges

### Previous Story Intelligence (2-M6)

- TAB indent + double quotes for all TypeScript
- Run `bun check` to verify formatting
- Test changes with `bun test:db` for database-related code

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Added `PathConfig` interface with `selectMode`, `startPath`, `mustExist` to backend
- Exported `PathConfig` from `step-types.ts` for shared usage
- Implemented `validateRelativePath` with comprehensive security checks
- Implemented `validateFolderName` utility for folder name validation
- Created `TwoPartDirectoryInput` component for `mustExist: false` scenarios
- Updated `AskUserStep` to handle `relative-path` type and two-part input
- All tests pass (62 tests, 73 expect() calls)

### Change Log

- 2026-01-16: Initial story creation via create-story workflow
- 2026-01-16: Refined scope via Advanced Elicitation (ADR analysis)
  - Removed file selection mode (no current use case)
  - Added two-part directory input for `mustExist: false`
  - Added `relative-path` field type for artifact output paths
  - Documented out-of-scope items
- 2026-01-16: Quality validation improvements
  - Fixed folder name regex to support hidden folders (`.chiron`)
  - Added error UX requirements and form integration notes
  - Specified shared type location (`step-types.ts`)
  - Added Windows reserved name validation
  - Added platform fallback and accessibility requirements
- 2026-01-16: Added comprehensive Validation Error Messages table
  - Specified exact error messages for all validation scenarios
  - Added test subtask for error message verification
- 2026-01-17: Code review fixes
  - Removed legacy adapter tests (not needed post-Effect migration)
  - Fixed test import for removed `createLegacyUserFormHandler`
  - Tests pass: 62 tests, 73 expect() calls

### File List

- `packages/api/src/services/workflow-engine/step-handlers/user-form-handler.ts` - Added PathConfig, validateRelativePath, validateFolderName
- `packages/api/src/services/workflow-engine/step-handlers/user-form-handler.test.ts` - Added 28 new tests for validation
- `packages/api/src/services/workflow-engine/step-types.ts` - Export PathConfig type
- `apps/web/src/components/ui/two-part-directory-input.tsx` - NEW: Two-part directory input component
- `apps/web/src/components/workflows/steps/ask-user-step.tsx` - Added relative-path type and two-part input integration

