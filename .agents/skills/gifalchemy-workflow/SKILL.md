---
name: gifalchemy-workflow
description: Task management and documentation workflow using "Build Notes" and "Contexts" for GifAlchemy.
category: workflow
tags: [workflow, documentation, management]
---

# GifAlchemy Task Workflow

## Build Notes Files
1. **Location**: `/ProjectDocs/Build_Notes/`
2. **Naming**: `build-title_phase-#_task-group-name.md`
   - e.g., `supabase-schema-standardization_phase-1_preparation-and-code-analysis.md`
3. **Structure**:
   - **Task Objective**: Summary of goals.
   - **Current State Assessment**: Brief description of current state.
   - **Future State Goal**: Brief description of future state.
   - **Implementation Plan**: Numbered list of steps with checklists.
4. **Maintenance**: Line out completed tasks (NEVER delete). Append new tasks as the plan evolves.
5. **Completion**: Move to `/ProjectDocs/Build_Notes/completed/` when finished or `/archived/` if deprecated.

## Context Files
- **Master Context**: `/ProjectDocs/contexts/projectContext.md` (overarching scope).
- **Secondary Contexts**: e.g., `uiContext.md`, `featureAContext.md`.
- **Updates**: Update only for major changes. Record all modifications in the corresponding Build Notes.

## Methodology
- **System 2 Thinking**: Analytical rigor; break requirements into small parts.
- **Tree of Thoughts**: Evaluate multiple solutions and consequences.
- **Iterative Refinement**: Review for optimizations before finalizing.
