# Changelog

## Unreleased

- Added support for up to four screenshots in one inbox capture while retaining the original single-attachment fields.
- Added a compact, read-only recent-captures list to the browser page.
- Added automatic fallback within ports 4784–4883 when the default port 4783 is occupied. Explicit ports remain exact.
- Added an optional, portable `spec-driven` workflow profile with configurable ticket prefixes, project document locations, and focused test command.
- Documented npm CLI argument forwarding with `npm run start -- --port <port>`.
- Prevented symbolic-link inbox paths from escaping the project root.
- Fixed duplicate-ID cleanup so it cannot delete an existing attachment.
- Added GitHub Actions coverage on Node.js 22.
