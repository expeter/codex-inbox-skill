# Changelog

## Unreleased

- Expanded Codex skill installation guidance with snapshot, updateable Git checkout, development symlink, release pinning, authentication troubleshooting, migration, verification, and explicit update workflows.
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
