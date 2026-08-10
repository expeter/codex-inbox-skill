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
