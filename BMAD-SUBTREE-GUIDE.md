# BMAD Source Subtree Guide

## 📚 What We Have Now

This project now includes the **full BMAD source code** as a git subtree in `bmad-source/`.

### Directory Structure

```
chiron/
├── bmad/                    # Your BMAD v6 installation (alpha.9)
│   ├── core/                # Installed modules
│   ├── bmm/
│   ├── bmb/
│   └── cis/
│
├── bmad-source/            # NEW: Full BMAD source (alpha.12)
│   ├── src/                # Source code
│   ├── docs/               # Documentation
│   ├── tools/              # Build tools
│   └── test/               # Tests
│
└── (rest of Chiron)
```

### Why Two Folders?

- **`bmad/`** - Runtime installation (what Chiron uses)
- **`bmad-source/`** - Reference source (what we study & build against)

---

## 🎯 Current Versions

- **Installed (`bmad/`)**: v6.0.0-alpha.9 (Nov 15, 2025)
- **Source (`bmad-source/`)**: v6.0.0-alpha.12 (Latest main branch)

---

## 🔄 Updating BMAD Source

### When to Update

- New BMAD version released
- Bug fixes in BMAD you want to reference
- New features you want to study

### How to Update

```bash
# Pull latest BMAD changes
git subtree pull --prefix=bmad-source bmad-upstream main --squash

# This will:
# 1. Fetch latest from BMAD repo
# 2. Merge into bmad-source/
# 3. Create a merge commit in your repo
```

### Upgrading Your Installation

After updating source, if you want to upgrade your runtime:

```bash
# Check what version is available
cat bmad-source/package.json | grep version

# Upgrade your installation
cd chiron
npx bmad-method@alpha upgrade

# Verify new version
cat bmad/core/config.yaml | grep Version
```

---

## 🚀 Benefits of This Setup

### For Development

1. **Deep Reference Access**
   - Study workflow engine implementation
   - Understand variable resolution
   - See how agents are structured
   - Reference actual code when building Chiron

2. **I Can Read It!**
   - Claude can now access full BMAD source
   - Answer detailed questions about implementation
   - Reference specific files and patterns
   - Help you understand internals

3. **Build Integration**
   - Chiron can import types from bmad-source/
   - Reference workflow schemas
   - Copy patterns directly
   - Test against actual BMAD structures

### For Thesis

1. **Academic Reference**
   - Show exact BMAD version used
   - Reference specific implementation details
   - Cite actual code in your thesis
   - Reproducible research

2. **Version Control**
   - Exact snapshot of BMAD when you started
   - Can update when needed
   - Git history shows evolution
   - No "code disappeared" issues

---

## 📖 Using BMAD Source

### Reading Workflow Engine

```bash
# Core workflow execution
bmad-source/src/core/workflow-engine.js

# Module structure
bmad-source/src/modules/bmm/
bmad-source/src/modules/bmb/
bmad-source/src/modules/cis/

# Documentation
bmad-source/docs/
```

### Understanding Patterns

```bash
# How workflows are structured
bmad-source/src/modules/bmm/workflows/

# How agents work
bmad-source/src/modules/bmm/agents/

# Build & installation
bmad-source/tools/cli/
```

---

## ⚠️ Important Notes

### Don't Modify bmad-source/

This folder is managed by git subtree. Changes here should come from upstream BMAD only.

**If you need to modify:**

1. Fork BMAD on GitHub
2. Make changes in your fork
3. Update the subtree remote to your fork
4. Or: Keep local patches in a separate branch

### Keep bmad/ Separate

Your `bmad/` installation is managed by `npx bmad-method`. Don't manually sync it with `bmad-source/`.

**Update process:**

1. Update bmad-source/ with subtree pull
2. Review changes
3. When ready, upgrade bmad/ installation with npx

---

## 🔍 Common Use Cases

### 1. Understanding a Workflow

```bash
# I want to know how sprint-planning works
cat bmad-source/src/modules/bmm/workflows/sprint-planning/workflow.yaml
cat bmad-source/src/modules/bmm/workflows/sprint-planning/instructions.md
```

### 2. Checking Variable Resolution

```bash
# How does BMAD resolve {config_source} variables?
grep -r "config_source" bmad-source/src/core/
```

### 3. Building Chiron Against BMAD

```typescript
// Import BMAD types/schemas
import { WorkflowSchema } from "../bmad-source/src/core/types";

// Reference BMAD patterns
const workflowStructure = {
  // Based on bmad-source/src/core/workflow.schema.yaml
};
```

### 4. Asking Claude About BMAD

> "How does BMAD handle step execution in workflow.xml?"
>
> Claude can now read: `bmad-source/src/core/tasks/workflow.xml`

---

## 📊 Version Comparison

| Aspect       | alpha.9 (Installed) | alpha.12 (Source)  |
| ------------ | ------------------- | ------------------ |
| **Location** | `bmad/`             | `bmad-source/`     |
| **Purpose**  | Runtime             | Reference          |
| **Updated**  | Manual (npx)        | Git subtree        |
| **Modified** | Yes (your config)   | No (upstream only) |

---

## 🎓 For Your Thesis

When citing BMAD:

```
BMAD Method Framework
Version: 6.0.0-alpha.12
Repository: https://github.com/bmad-code-org/BMAD-METHOD
Commit: be04d687 (snapshot in bmad-source/)
Date: November 20, 2025
```

---

## 🆘 Troubleshooting

### Subtree Pull Conflicts

```bash
# If conflicts during update:
git status
# Resolve conflicts in bmad-source/
git add bmad-source/
git commit
```

### Out of Sync

```bash
# Check what version you have
cat bmad-source/package.json | grep version

# Check what's available upstream
git fetch bmad-upstream
git log bmad-upstream/main --oneline | head -10
```

### Want to Revert

```bash
# If subtree pull broke something
git log --oneline | grep bmad-source
git revert <commit-hash>
```

---

## 📚 Additional Resources

- **BMAD Docs**: `bmad-source/docs/`
- **BMAD README**: `bmad-source/README.md`
- **Changelog**: `bmad-source/CHANGELOG.md`
- **Contributing**: `bmad-source/CONTRIBUTING.md`

---

**Last Updated**: November 20, 2025  
**Current BMAD Source**: v6.0.0-alpha.12  
**Git Subtree Setup**: Complete ✅
