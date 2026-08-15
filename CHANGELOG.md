# Changelog

## Unreleased

- Replaced olive-tinted surfaces with a neutral technical palette, made blue the generic accent, and followed the operating-system theme until a browser preference is saved.
- Added quick copy-ID controls to capture rows.
- Added an append-only follow-up flow that reuses an existing capture in the main composer, highlights its source row, and saves revisions under a new linked capture ID.
- Labeled raw reports as inbox submissions and accepted project changes as implementation tickets, and displayed each follow-up's source ID in both the recent list and saved Markdown body.
- Replaced the README workflow screenshot with the approved neutral-blue capture.
- Clarified that a newly installed skill is used in a following turn, with a Codex restart only when automatic discovery does not expose it.
- Reduced the Codex installer prompt to the skill source, avoiding consumer-side repository verification.
- Streamlined skill setup into copyable Codex-assisted, global, workspace-local, and direct-server paths with top-level links.
- Included the README workflow image in the published package contents.
- Documented capture retention as an explicit per-project choice, with ignored raw captures recommended for public repositories.
- Added a capture-page screenshot to the README as a visual example of the Project Inbox workflow.
- Corrected the MIT license publisher attribution to expeter.

## 1.0.0 - 2026-08-10

- Removed repository-specific references to a local development helper from the published project instructions.
- Added connected GitHub repository, homepage, issue, and clone metadata for the initial publication.
- Added a GitHub-facing README with installation, trial, configuration, safety, and development guidance.
- Added optional tested project accent palettes for distinguishing concurrent inboxes.
- Added removable screenshot previews in a horizontally scrolling strip while retaining the four-image limit.
- Added a persistent light or dark appearance toggle stored in the browser.
- Added a read-only link to the configured ticket register for SPEC-driven projects.
- Distinguished the configured project name from its shortened filesystem and inbox paths in the capture page.
- Added support for up to four screenshots in one inbox capture while retaining the original single-attachment fields.
- Added a compact, read-only recent-captures list to the browser page.
- Added automatic fallback within ports 4784–4883 when the default port 4783 is occupied. Explicit ports remain exact.
- Added an optional, portable `spec-driven` workflow profile with configurable ticket prefixes, project document locations, and focused test command.
- Documented npm CLI argument forwarding with `npm run start -- --port <port>`.
- Prevented symbolic-link inbox paths from escaping the project root.
- Fixed duplicate-ID cleanup so it cannot delete an existing attachment.
- Added GitHub Actions coverage on Node.js 22.
