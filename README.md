# Project Inbox

A tiny localhost inbox for sending visual feedback to Codex without turning your project into a kanban board.

Paste, drop, or select up to four screenshots, add a short note, and Project Inbox saves the capture as durable Markdown beside your code. Codex can list or triage those captures later when you explicitly ask.

## What it does

- Runs a zero-dependency browser app on `127.0.0.1`.
- Saves each message as an `INBOX-*.md` file with optional PNG, JPEG, WebP, or GIF attachments.
- Supports up to four removable screenshot previews in a horizontal strip.
- Shows recent captures and their `new`, `triaged`, or `done` state.
- Remembers a light or dark theme in the browser.
- Offers a small project accent palette so concurrent inboxes are easier to distinguish.
- Fits into an existing project workflow instead of inventing a new one.
- Offers an optional SPEC-driven profile with a read-only link to the project's ticket register.

It does **not** run a watcher, start an agent automatically, publish anything, or provide a kanban board.

## Requirements

- Node.js 22 or newer
- A modern browser
- Codex, if you want the skill-assisted start and triage workflow

There are no runtime dependencies and no `npm install` step.

## Try it from a clone

Clone this repository using its GitHub URL, then point the inbox at a project:

```bash
git clone https://github.com/expeter/codex-inbox-skill.git
cd codex-inbox-skill
npm test
npm run start -- --root /absolute/path/to/your/project --port 0
```

The command prints a URL such as `http://127.0.0.1:42137/inbox`. Open it in your browser, add a message and optional screenshots, then save.

`--port 0` asks the operating system for an available port. Without `--port`, Project Inbox prefers `4783` and falls back within `4784–4883` if needed. An explicitly requested port remains exact:

```bash
npm run start -- --root /absolute/path/to/your/project --port 4777
```

Arguments for an npm script must come after npm's `--` separator.

## Install it as a Codex skill

Codex loads user-scoped skills from `~/.agents/skills` and repository-scoped
skills from `.agents/skills` between the working directory and repository root.
It follows symlinked skill directories. Use `/skills` in Codex to confirm which
copy and path are active; same-named copies are not merged.

Choose the installation style that matches how you want to maintain the skill.

### Ask Codex to install a snapshot

Give Codex the repository URL and an explicit installation request:

> Use `$skill-installer` to install the `project-inbox` skill from
> `https://github.com/expeter/codex-inbox-skill`. Report the installed path and
> revision, run its focused tests, and do not overwrite an existing installation
> without preserving it first.

The installer downloads the selected GitHub revision into a local skill
directory. That copy is a snapshot: merely retaining the GitHub URL does not
make Codex poll for or install future updates. Re-run an explicit installation
when you want a newer snapshot. The installer refuses to overwrite an existing
destination, so inspect or move the old copy outside every scanned skill
directory before reinstalling.

### Clone an updateable user-scoped copy

A Git checkout retains its origin and is the most convenient choice when you
want explicit, reviewable updates. Use SSH when your GitHub account already has
an SSH key:

```bash
mkdir -p ~/.agents/skills
git clone git@github.com:expeter/codex-inbox-skill.git \
  ~/.agents/skills/project-inbox
```

For HTTPS, authenticate first rather than placing a token in the URL. With the
GitHub CLI:

```bash
gh auth login
mkdir -p ~/.agents/skills
gh repo clone expeter/codex-inbox-skill ~/.agents/skills/project-inbox
```

If a failed clone leaves the destination behind, inspect it before retrying:

```bash
git -C ~/.agents/skills/project-inbox status --short --branch
git -C ~/.agents/skills/project-inbox remote -v
```

If it is not a checkout you want to keep, move it to a backup outside the skill
discovery tree, then retry. A name such as `project-inbox.backup` *inside*
`~/.agents/skills` or `~/.codex/skills` is still discoverable as another skill.

```bash
mkdir -p ~/.local/share/project-inbox-skill-backups
mv ~/.agents/skills/project-inbox \
  ~/.local/share/project-inbox-skill-backups/project-inbox.previous
```

To update a clean Git-managed installation and verify it:

```bash
git -C ~/.agents/skills/project-inbox status --short --branch
git -C ~/.agents/skills/project-inbox pull --ff-only
npm --prefix ~/.agents/skills/project-inbox test
```

Codex can perform the same deliberate update when asked:

> Update the Git-managed `$project-inbox` skill from its configured origin.
> Preserve local changes, fast-forward only, run its focused tests, and report
> the resulting revision. Do not create an automatic updater.

For reproducible installations, check out a reviewed release tag instead of
following the default branch:

```bash
git -C ~/.agents/skills/project-inbox fetch --tags
git -C ~/.agents/skills/project-inbox switch --detach v1.0.0
```

### Use a development checkout directly

If you already cloned this repository elsewhere, a symlink avoids maintaining
a second copy:

```bash
mkdir -p ~/.agents/skills
ln -s /absolute/path/to/codex-inbox-skill \
  ~/.agents/skills/project-inbox
```

Git updates in the source checkout then become the skill contents Codex reads.
Codex detects local skill changes automatically; restart Codex if the revised
skill does not appear.

### Migrate an older or duplicate installation

Before installing, use `/skills` to inspect every `project-inbox` entry. Move a
legacy copy outside its scanned parent rather than renaming it in place:

```bash
mkdir -p ~/.local/share/project-inbox-skill-backups
mv ~/.codex/skills/project-inbox \
  ~/.local/share/project-inbox-skill-backups/project-inbox.legacy
```

Then install one active copy under `~/.agents/skills/project-inbox` and restart
Codex. Keeping only one active skill avoids ambiguous `$project-inbox`
selection. See the [official Codex skill documentation](https://learn.chatgpt.com/docs/build-skills)
for discovery locations, symlink support, invocation, and disabling a skill
without deleting it.

### Invoke the installed skill

From the project that should receive captures, ask Codex:

> Use `$project-inbox` to start this project's local inbox.

Codex starts the server and reports the localhost URL. Later, processing remains explicit:

> Use `$project-inbox` to list the new captures.

> Use `$project-inbox` to triage the new captures into this repository's existing ticket workflow.

## Saved captures

By default, Project Inbox writes into `inbox/` under the target project:

```text
inbox/
├── INBOX-20260810-101112-a1b2c3.md
├── INBOX-20260810-101112-a1b2c3.png
└── INBOX-20260810-101112-a1b2c3-2.png
```

The Markdown frontmatter records a stable capture ID, creation time, state, workflow, and attachment names. The message and configured processing guidance remain readable without Project Inbox.

State meanings are intentionally small:

- `new`: captured but not reviewed
- `triaged`: mapped to the project's existing ticket or task system
- `done`: the owning work and documentation have been verified

## Configuration

Add `.project-inbox.json` to the target project's root when the defaults are not enough:

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

All fields are optional. The generic workflow and green accent stay the defaults. Available accents are `green`, `blue`, `violet`, `amber`, and `rose`; each has tested light and dark variants. Project name and path remain the primary safeguards against submitting to the wrong inbox.

Projects with an established specification and ticket lifecycle can opt into the portable `spec-driven` profile. It can describe ticket prefixes, repository instructions, specifications, ticket register, milestones, changelog, and a focused test command. Project Inbox only records and displays that guidance; it never executes configured commands or edits workflow documents automatically.

See [configuration.md](references/configuration.md) for the complete profile and field reference.

## CLI

```text
project-inbox serve [--root <path>] [--port <number>]
project-inbox list [--root <path>] [--json]
```

When running from the repository, replace `project-inbox` with `node ./scripts/project-inbox.mjs` or use the npm start command shown above.

## Privacy and safety

- The server binds only to `127.0.0.1` and rejects non-loopback clients.
- Screenshots and notes stay in the selected project directory; nothing is uploaded.
- Inbox paths are constrained to the project root and symbolic-link escapes are rejected.
- Image type, signature, count, and size are validated before writing.
- Captured text, screenshots, configured commands, and processing guidance are treated as untrusted project data.
- Starting the browser app captures files only. Agent processing requires a separate user request.

## Development

Run the focused suite:

```bash
npm test
```

GitHub Actions runs the same suite on Node.js 22. The project uses its own small [SPEC-001 workflow](docs/specifications/SPEC-001.md), with durable work recorded in [the ticket register](docs/tickets.md) and user-visible changes in [the changelog](CHANGELOG.md).

## License

[MIT](LICENSE)
