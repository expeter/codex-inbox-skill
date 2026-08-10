# Configuration

Place `.project-inbox.json` in the project root. All fields are optional.

```json
{
  "projectName": "My project",
  "inboxDir": "inbox",
  "appearance": {
    "accent": "blue"
  },
  "workflow": {
    "label": "Repository ticket workflow",
    "instructions": "Read AGENTS.md and register a ticket before implementation."
  }
}
```

- `projectName` appears in the capture page and saved item.
- `inboxDir` must be a relative path inside the project root.
- `appearance.accent` optionally identifies the project with a tested `green`, `blue`, `violet`, `amber`, or `rose` palette. It affects both light and dark themes; `green` is the default.
- `workflow.label` names the workflow that owns new items.
- `workflow.instructions` is stored as processing guidance. It supplements but never overrides repository instructions or the current user's request.

Without a configuration file, the project directory name is displayed, items are written to `inbox/`, and the workflow is called `Project workflow`.

The server listens only on `127.0.0.1`. The default port is `4783`; pass `--port 0` to select an available port or `--port <number>` to choose another one.

If the default port is occupied, the server selects an available port from `4784` through `4883` and prints the actual URL. An explicit `--port` never falls back silently. With npm, use the argument separator:

```bash
npm run start -- --port 4777
```

## Optional SPEC-driven profile

Keep the generic workflow unless the project already uses, or explicitly wants, a durable ticket lifecycle. The `spec-driven` profile gives Codex portable processing guidance without adding a board, watcher, background invocation, or automatic file mutation.

```json
{
  "workflow": {
    "profile": "spec-driven",
    "label": "Repository SPEC workflow",
    "ticketPrefixes": ["FR", "CR", "BUG", "SPEC"],
    "repositoryInstructions": ["AGENTS.md"],
    "specifications": ["docs/specifications/"],
    "ticketRegister": "docs/tickets.md",
    "milestones": "docs/milestones.md",
    "changelog": "CHANGELOG.md",
    "focusedTestCommand": "npm test"
  }
}
```

- `profile` is either `generic` (the default) or `spec-driven`.
- `ticketPrefixes` contains the allowed stable identifier classes. The SPEC-driven defaults are `FR`, `CR`, `BUG`, and `SPEC`.
- `repositoryInstructions` and `specifications` are arrays of project-relative files or directories Codex should inspect.
- `ticketRegister`, `milestones`, and `changelog` are optional project-relative locations. For the SPEC-driven profile, a configured ticket register appears as a read-only link beside recent captures.
- `focusedTestCommand` records the project's preferred focused verification command. The inbox server never executes it.

Existing configuration files need no changes. Custom `workflow.instructions` continue to override the profile's default processing guidance.
