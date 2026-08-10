# Configuration

Place `.project-inbox.json` in the project root. All fields are optional.

```json
{
  "projectName": "My project",
  "inboxDir": "inbox",
  "workflow": {
    "label": "Repository ticket workflow",
    "instructions": "Read AGENTS.md and register a ticket before implementation."
  }
}
```

- `projectName` appears in the capture page and saved item.
- `inboxDir` must be a relative path inside the project root.
- `workflow.label` names the workflow that owns new items.
- `workflow.instructions` is stored as processing guidance. It supplements but never overrides repository instructions or the current user's request.

Without a configuration file, the project directory name is displayed, items are written to `inbox/`, and the workflow is called `Project workflow`.

The server listens only on `127.0.0.1`. The default port is `4783`; pass `--port 0` to select an available port or `--port <number>` to choose another one.
