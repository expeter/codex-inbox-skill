# Ticket register

## Open

None.

## Resolved

- `SPEC-001` — Defined the repository's durable SPEC-driven delivery workflow. Verified with skill validation and the focused test suite.
- `BUG-001` — Prevented configured inbox paths from escaping the project root through symbolic links. Covered by regression test.
- `BUG-002` — Preserved existing attachments when an inbox ID collides. Covered by regression test.
- `FR-001` — Added safe default-port fallback and a read-only recent-captures list without workflow controls. Covered by server tests and a live smoke test.
- `FR-002` — Added up to four screenshots per capture with backward-compatible attachment metadata. Covered by storage tests.
- `CR-001` — Added a portable, opt-in SPEC-driven workflow profile while preserving generic configuration. Covered by configuration tests and skill validation.
- `FR-003` — Added removable screenshot previews in a horizontally scrolling four-image selection. Covered by focused page rendering tests.
- `FR-004` — Added a minimal light or dark preference persisted in browser storage. Covered by focused page rendering tests.
- `CR-002` — Linked SPEC-driven recent captures to the configured read-only ticket register without workflow management. Covered by profile and path-containment server tests.
- `CR-003` — Distinguished the configured project name from its shortened filesystem and inbox paths. Covered by focused page rendering tests.
- `CR-004` — Added a human-facing GitHub README and completed the publication-readiness audit. Verified with link, CLI, test, skill, Git integrity, and secrets checks.
- `FR-005` — Added validated project accent palettes for distinguishing concurrent inboxes while retaining project name and path as primary identity cues. Covered by configuration and rendering tests.
- `CR-005` — Replaced publication placeholders with the connected GitHub URL and added repository, homepage, and issue metadata. Verified with the focused test suite, skill validation, and placeholder checks.
- `CR-006` — Removed repository-facing references to the local dependency helper and prepared the stable `1.0.0` release. Verified with the focused test suite, CLI smoke check, skill validation, and repository-wide reference scan.
- `CR-007` — Expanded README guidance for Codex-assisted snapshots, updateable Git checkouts, development symlinks, release pinning, authentication recovery, duplicate migration, invocation, and explicit updates. Verified with the focused test suite, skill validation, and documentation diff checks.
- `CR-008` — Corrected the MIT license publisher attribution to expeter. Verified with the focused test suite and documentation diff checks.
- `CR-009` — Added the submitted Project Inbox capture-page screenshot to the README as a visual workflow example. Verified with byte-identical image comparison, README asset checks, the focused test suite, and skill validation.
