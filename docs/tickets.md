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
- `FR-006` — Stabilized the skill for the `1.0.1` release by packaging README image assets and defining capture retention as an explicit per-project decision, with ignored raw captures recommended for public repositories. Verified with the package-content regression, focused test suite, and skill validation.
- `CR-010` — Made the Codex installation prompt directly copyable, added top-level links for Codex-assisted and global skill installation, and reduced the global Git workflow to essential clone and update commands. Verified with focused README regression coverage and the test suite.
- `CR-011` — Reduced README installation guidance to Codex-assisted, global, workspace-local, and direct-server paths by removing symlink, migration, and invocation walkthroughs. Verified with focused README regression coverage and the test suite.
- `CR-012` — Reduced the copyable `$skill-installer` prompt to the repository source only, leaving verification to the installer and release CI. Verified with focused README regression coverage and the test suite.
- `CR-013` — Clarified post-install activation: use the newly installed skill in a following turn, and restart Codex only when automatic skill discovery does not expose it. Verified with focused README regression coverage and the test suite.
- `FR-007` — Replaced olive-green surfaces with neutral graphite and white surfaces, made blue the generic accent while retaining all existing accents, and followed the operating-system theme until the user saves a preference. Verified with configuration and rendering regressions, the focused test suite, and a live browser-serving smoke test.
- `FR-008` — Added read-only Markdown links and copy-ID controls to recent captures without adding editing or workflow mutation. Verified with rendering and HTTP regressions, the focused test suite, and a live data smoke test.
- `CR-014` — Replaced the README workflow screenshot with the approved neutral-blue capture from `INBOX-20260815-101129-61de58`. Verified with byte-identical SHA-256 comparison and the focused test suite.
- `FR-009` — Added compact numbered screenshot links (`▧1` through `▧4`) to recent capture rows through a safe read-only image route. Verified with rendering and HTTP regressions, the focused test suite, and a live PNG smoke check.
- `CR-015` — Made steering more autonomous by requiring concrete improvement proposals to become tickets and proceed whenever no material decision or additional authority is needed. Verified in `SPEC-001` and through this ticketed delivery flow.
- `CR-016` — Distinguished raw inbox captures and capture-processing states from accepted changes in the project ticket register. Verified with generic and SPEC-driven rendering regressions, the focused test suite, and a live page smoke check.
