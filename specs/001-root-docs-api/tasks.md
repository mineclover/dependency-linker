# Tasks: Documentation Improvement and Restructuring

**Input**: Design documents from `/Users/junwoobang/project/dependency-linker/specs/001-root-docs-api/`
**Prerequisites**: plan.md (required), research.md, data-model.md, quickstart.md

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root

## Phase 3.1: Setup
- [ ] T001 [P] Move `API.md` to `docs/API.md`.
- [ ] T002 [P] Move `DEBUGGING.md` to `docs/DEBUGGING.md`.
- [ ] T003 [P] Move `EXTENSION_GUIDE.md` to `docs/EXTENSION_GUIDE.md`.
- [ ] T004 [P] Move `PERFORMANCE.md` to `docs/PERFORMANCE.md`.
- [ ] T005 [P] Move `quickstart.md` to `docs/quickstart.md`.
- [ ] T006 [P] Move `TECHNICAL_README.md` to `docs/TECHNICAL_README.md`.
- [ ] T007 [P] Move `USAGE.md` to `docs/USAGE.md`.

## Phase 3.2: Documentation Update
- [ ] T008 Update `README.md` to link to the new `docs/` directory for detailed documentation.
- [ ] T009 Create a new file `docs/CORE_LOGIC.md` and document the core logic, architecture, and API/CLI integration based on the analysis in `research.md`.
- [ ] T010 Review and update the content of all moved documents in the `docs/` directory to ensure they are up-to-date and consistent.

## Dependencies
- T001-T007 can run in parallel.
- T008 should run after T001-T007 are complete.
- T009 and T010 can run in parallel after T001-T007 are complete.

## Parallel Example
```
# Launch T001-T007 together:
Task: "Move `API.md` to `docs/API.md`."
Task: "Move `DEBUGGING.md` to `docs/DEBUGGING.md`."
Task: "Move `EXTENSION_GUIDE.md` to `docs/EXTENSION_GUIDE.md`."
Task: "Move `PERFORMANCE.md` to `docs/PERFORMANCE.md`."
Task: "Move `quickstart.md` to `docs/quickstart.md`."
Task: "Move `TECHNICAL_README.md` to `docs/TECHNICAL_README.md`."
Task: "Move `USAGE.md` to `docs/USAGE.md`."
```
