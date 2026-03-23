# Work Unit Facts Alignment Assessment

## Executive Summary

This document identifies all gaps between the **Methodology Facts** (reference implementation) and **Work Unit Facts** (current implementation) to guide alignment work. The goal is to make Work Unit Facts behave exactly like Methodology Facts, with the only difference being the additional "Work Unit" fact type.

---

## Files Analyzed

### Methodology Facts (Reference)
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx` - Main route with dialog
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/methodology-facts.tsx` - Facts table component
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/fact-validation.ts` - Validation utilities
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/fact-editor-controls.tsx` - Allowed values chip editor
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/version-workspace.tsx` - Fact editor value types and parsing

### Work Unit Facts (Target)
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - Main work unit facts component
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` - Route using FactsTab

### API/Schema
- `/home/gondilf/Desktop/projects/masters/chiron/packages/contracts/src/methodology/fact.ts` - Fact schema definitions
- `/home/gondilf/Desktop/projects/masters/chiron/packages/api/src/routers/methodology.ts` - API router with work unit fact endpoints
- `/home/gondilf/Desktop/projects/masters/chiron/packages/methodology-engine/src/services/work-unit-fact-service.ts` - Work unit fact service

---

## Detailed Gap Analysis

### 1. FORM FIELDS

#### Methodology Facts (Complete)
| Field | Type | UI Component |
|-------|------|--------------|
| Display Name | string | Input |
| Fact Key | string | Input (required validation) |
| Fact Type | enum | Select (string, number, boolean, json) |
| Default Value | type-specific | Input (conditional on type) |
| Description | string | Textarea |
| Human Guidance | string | Textarea |
| Agent Guidance | string | Textarea |
| Validation Type | enum | Select (none, path, allowed-values) |
| Path Kind | enum | Select (file, directory) - conditional |
| Trim Whitespace | boolean | Checkbox - conditional |
| Disallow Absolute | boolean | Checkbox - conditional |
| Prevent Traversal | boolean | Checkbox - conditional |
| Allowed Values | string[] | Chip Editor - conditional |

#### Work Unit Facts (Incomplete)
| Field | Status | Gap |
|-------|--------|-----|
| Display Name | Present | Same |
| Fact Key | Present | Same |
| Fact Type | Present | Same + "work unit" type |
| Default Value | **MISSING** | No default value field at all |
| Description | Present | Same |
| Human Guidance | Present | Same |
| Agent Guidance | Present | Same |
| Validation Type | Present | **MISSING "allowed-values" option** |
| Path Kind | Present | Same |
| Trim Whitespace | **MISSING** | Not implemented |
| Disallow Absolute | **MISSING** | Not implemented |
| Prevent Traversal | **MISSING** | Not implemented |
| Allowed Values | **MISSING** | No chip editor |
| JSON Sub-schema | **MISSING** | No JSON key editor |

**CRITICAL GAP**: Default value selector is completely missing for all types.

---

### 2. TYPE-SPECIFIC INPUTS

#### Methodology Facts
- **string**: Text input for default value
- **number**: Number input for default value
- **boolean**: Checkbox for default value (true/false)
- **json**: Complex sub-schema editor with:
  - Add/remove JSON keys
  - Key display name
  - Key name
  - Default value (type-specific input)
  - Value type selector (string/number/boolean)
  - Validation type per key (none/path/allowed-values)
  - Path validation options per key

#### Work Unit Facts
- **string**: No default value input
- **number**: No default value input  
- **boolean**: No default value input
- **json**: No sub-schema editor
- **work unit**: Work unit selector (this is the only addition, which is correct)

**MAJOR GAP**: No type-specific default value inputs.

---

### 3. VALIDATION HANDLING

#### Methodology Facts Validation Types
```typescript
type ValidationKind = "none" | "path" | "allowed-values" | "json-schema";
```

Full validation structure:
- **none**: `{ kind: "none" }`
- **path**: `{ kind: "path", path: { pathKind, normalization, safety } }`
- **allowed-values**: `{ kind: "json-schema", schemaDialect, schema: { type: "string", enum: values } }`
- **json-schema**: `{ kind: "json-schema", schemaDialect, schema: object }`

#### Work Unit Facts Validation Types
```typescript
type ValidationKind = "none" | "path" | "json-schema";
```

**MISSING**: "allowed-values" validation type.

**MISSING**: Path validation options:
- `normalization.trimWhitespace` (boolean)
- `safety.disallowAbsolute` (boolean)  
- `safety.preventTraversal` (boolean)

---

### 4. UI/UX PATTERNS

#### Methodology Facts
- Uses **DataGrid** component from `@/components/data-grid`
- Columns: Fact (name+key), Type, Validation, Default, Guidance, Actions
- Icons for validation types (FileCode2Icon, ListIcon, BracesIcon, ShieldCheckIcon)
- Dropdown menu for actions (Edit, Delete)
- Tooltip for guidance viewer
- Dialog width: `w-[min(72rem,calc(100vw-2rem))]`
- Two-tab dialog: Contract | Guidance
- Dirty state tracking per tab with asterisk indicator
- Discard changes confirmation dialog
- Form uses `@tanstack/react-form` with proper validation

#### Work Unit Facts
- Uses **native HTML table** (not DataGrid)
- Columns: Fact, Type, Validation, Guidance, Actions
- No icons for validation types (just text badges)
- Inline buttons for actions (not dropdown)
- No tooltip for guidance
- Dialog width: `w-[min(48rem,calc(100vw-2rem))]` (narrower)
- Two-tab dialog: Contract | Guidance (same)
- Dirty state tracking (same)
- Discard changes confirmation dialog (same)
- Uses local `useState` instead of `@tanstack/react-form`

**UI GAPS**:
1. Not using DataGrid component
2. No validation type icons
3. No default value column in table
4. Narrower dialog limits space for complex forms
5. No form library integration

---

### 5. SAVE/SUBMIT BEHAVIOR

#### Methodology Facts
- Form submission uses `@tanstack/react-form` handleSubmit
- Validation before submit (fact key required check)
- Async save with loading state
- Toast notifications for errors
- Proper mutation input transformation via `factToMutationInput()`
- JSON sub-keys converted to JSON schema validation

#### Work Unit Facts
- Direct button click handler (not form submit)
- No validation before save
- Async save but no loading state feedback
- No toast notifications
- Manual mutation input transformation inline in route file
- No JSON sub-key handling

**BEHAVIOR GAPS**:
1. No form validation before save
2. No loading state
3. No error feedback
4. Inline transformation logic (not reusable)

---

### 6. DATA MODEL DIFFERENCES

#### Methodology Fact (FactEditorValue)
```typescript
type FactEditorValue = {
  __uiId?: string;
  name?: string;
  key: string;
  factType: "string" | "number" | "boolean" | "json";
  defaultValue?: unknown;
  description?: string;
  guidance?: {
    human?: { short?: string; long?: string; examples?: string[] };
    agent?: { intent?: string; constraints?: string[]; examples?: string[] };
  };
  validation?: 
    | { kind: "none" }
    | { kind: "path"; path: { pathKind, normalization, safety } }
    | { kind: "json-schema"; schemaDialect: string; schema: unknown };
};
```

#### Work Unit Fact (RawFact in FactsTab)
```typescript
type RawFact = {
  name?: string;
  key: string;
  factType: "string" | "number" | "boolean" | "json" | "work unit";
  defaultValue?: unknown;  // Present in type but not in UI
  guidance?: {
    human?: { markdown?: string; short?: string };
    agent?: { markdown?: string; intent?: string };
  };
  description?: string;
  validation?: {
    kind?: "none" | "path" | "json-schema";
    dependencyType?: string;
    workUnitKey?: string;
  };
  dependencyType?: string;
};
```

**MODEL GAPS**:
1. Work unit facts have additional "work unit" type (correct)
2. Work unit facts have `dependencyType` and `workUnitKey` (correct for work unit type)
3. Missing allowed-values in validation kind
4. Missing full path validation structure

---

### 7. API CONTRACT

#### Methodology Facts API
```typescript
// Router: orpc.methodology.version.fact
create: input { versionId, fact: MethodologyFactDefinitionInput }
update: input { versionId, factKey, fact: MethodologyFactDefinitionInput }
delete: input { versionId, factKey }
```

#### Work Unit Facts API
```typescript
// Router: orpc.methodology.version.workUnit.fact
create: input { versionId, workUnitTypeKey, fact: variableDefinitionSchema }
update: input { versionId, workUnitTypeKey, factKey, fact: variableDefinitionSchema }
delete: input { versionId, workUnitTypeKey, factKey }
```

**API STATUS**: API is properly implemented and supports the same fact structure. The gap is purely in the UI.

---

## Complete List of Missing Features in Work Unit Facts

### Must Add (Critical)
1. **Default Value Field** - Add to form for all fact types
2. **Type-Specific Default Inputs**:
   - String: text input
   - Number: number input
   - Boolean: checkbox
   - JSON: sub-schema editor
3. **Allowed Values Validation** - Add "allowed-values" to validation type select
4. **Allowed Values Chip Editor** - Use `AllowedValuesChipEditor` component
5. **Path Validation Options**:
   - Trim Whitespace checkbox
   - Disallow Absolute checkbox
   - Prevent Traversal checkbox

### Should Add (UX Improvements)
6. **Use DataGrid Component** - Replace native table with `DataGrid`
7. **Add Validation Icons** - Use same icons as methodology facts
8. **Add Default Value Column** - Show default in table
9. **Widen Dialog** - Use 72rem like methodology facts
10. **Use @tanstack/react-form** - Replace local state with form library
11. **Add Form Validation** - Validate fact key before save
12. **Add Loading States** - Show loading during mutations
13. **Add Toast Notifications** - Error/success feedback

### JSON Sub-Schema Editor (Complex)
14. **Add JSON Key Management** - Add/remove keys
15. **Key Display Name** - Input for human-readable name
16. **Key Name** - Input for property key
17. **Key Value Type** - Select (string/number/boolean)
18. **Key Default Value** - Type-specific input
19. **Key Validation** - Per-key validation options
20. **Convert to JSON Schema** - Transform to validation.schema

---

## Recommended Implementation Order

### Phase 1: Core Fields (High Impact, Low Complexity)
1. Add Default Value field to form
2. Add type-specific default value inputs
3. Add "allowed-values" to validation type
4. Integrate AllowedValuesChipEditor

### Phase 2: Path Validation (Medium Complexity)
5. Add path validation checkboxes (trim, disallow absolute, prevent traversal)

### Phase 3: JSON Sub-Schema (High Complexity)
6. Implement JSON key editor with all sub-features

### Phase 4: UX Polish (Low Complexity, High Value)
7. Replace table with DataGrid
8. Add validation icons
9. Widen dialog
10. Add loading states and toast notifications

---

## Schema Compatibility Notes

The API schema in `variableDefinitionSchema` already supports all the needed fields:
- `defaultValue`: `z.unknown().optional()`
- `validation`: Supports `none`, `path` (with full options), `json-schema`
- `allowed-values` is supported via `json-schema` with `enum`

The UI just needs to be updated to collect and send this data.

---

## Files to Modify

1. `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - Main changes
2. Potentially extract shared components from methodology facts for reuse

---

## Assessment Complete

Documented by: Claude Code
Date: 2026-03-23
