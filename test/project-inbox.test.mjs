import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { Script } from 'node:vm'
import { loadConfig, normalizeConfig } from '../src/config.mjs'
import { renderInboxPage } from '../src/page.mjs'
import { DEFAULT_PORT, isLoopbackAddress, startInboxServer } from '../src/server.mjs'
import { listInboxEntries, readInboxDetails, saveInboxEntry } from '../src/storage.mjs'

const temporaryDirectories = []
const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6fDqNwAAAABJRU5ErkJggg=='

async function temporaryProject() {
  const directory = await mkdtemp(join(tmpdir(), 'project-inbox-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

test('published package contents include local README images', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  const imagePaths = [...readme.matchAll(/!\[[^\]]*\]\((docs\/images\/[^)]+)\)/g)].map(match => match[1])

  assert.ok(imagePaths.length > 0)
  for (const imagePath of imagePaths) {
    assert.ok(
      manifest.files.some(entry => imagePath === entry || imagePath.startsWith(`${entry.replace(/\/$/, '')}/`)),
      `${imagePath} must be included in package.json files`,
    )
    assert.ok((await readFile(new URL(`../${imagePath}`, import.meta.url))).length > 0)
  }
})

test('README exposes copyable installation shortcuts', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')

  assert.match(readme, /\[Install with Codex\]\(#install-with-codex\)/)
  assert.match(readme, /\[Install globally\]\(#install-globally\)/)
  assert.match(readme, /\[Install in one workspace\]\(#install-in-one-workspace\)/)
  assert.match(readme, /\[Run the server directly\]\(#run-the-server-directly\)/)
  assert.match(readme, /### Install with Codex/)
  assert.match(readme, /### Install globally/)
  assert.match(readme, /### Install in one workspace/)
  assert.match(readme, /## Run the server directly/)
  assert.match(readme, /```text\nUse \$skill-installer to install project-inbox from:\nhttps:\/\/github\.com\/expeter\/codex-inbox-skill\n```/)
  assert.match(readme, /In the next turn, start it with:/)
  assert.match(readme, /Use \$project-inbox to start this project's local inbox\./)
  assert.match(readme, /If\n`\$project-inbox` is not available, restart Codex/)
  assert.doesNotMatch(readme, /Report the installed path and revision/)
  assert.doesNotMatch(readme, /run its focused tests/)
  assert.doesNotMatch(readme, /Use a development checkout directly/)
  assert.doesNotMatch(readme, /Migrate an older or duplicate installation/)
  assert.doesNotMatch(readme, /Invoke the installed skill/)
})

test('configuration keeps the inbox inside the project root', async () => {
  const root = await temporaryProject()
  assert.throws(() => normalizeConfig(root, { inboxDir: '../elsewhere' }), /inside the project root/)
  await writeFile(join(root, '.project-inbox.json'), JSON.stringify({
    projectName: 'Paper trail',
    inboxDir: '.feedback/inbox',
    workflow: { label: 'Ticket register', instructions: 'Create an FR before implementation.' },
  }))
  const config = await loadConfig(root)
  assert.equal(config.projectName, 'Paper trail')
  assert.equal(config.inboxDir, '.feedback/inbox')
  assert.equal(config.workflow.label, 'Ticket register')
  assert.equal(config.appearance.accent, 'blue')
  assert.equal(normalizeConfig(root, { appearance: { accent: 'violet' } }).appearance.accent, 'violet')
  assert.throws(() => normalizeConfig(root, { appearance: { accent: 'neon' } }), /must be one of/)
})

test('the SPEC-driven profile is optional and validates portable workflow locations', async () => {
  const root = await temporaryProject()
  assert.equal(normalizeConfig(root).workflow.profile, 'generic')
  const config = normalizeConfig(root, { workflow: {
    profile: 'spec-driven',
    ticketPrefixes: ['fr', 'BUG'],
    repositoryInstructions: ['AGENTS.md'],
    specifications: ['docs/specifications'],
    ticketRegister: 'docs/tickets.md',
    changelog: 'CHANGELOG.md',
    focusedTestCommand: 'npm test',
  } })
  assert.equal(config.workflow.profile, 'spec-driven')
  assert.deepEqual(config.workflow.ticketPrefixes, ['FR', 'BUG'])
  assert.match(config.workflow.instructions, /Register a stable ticket/)
  assert.throws(
    () => normalizeConfig(root, { workflow: { profile: 'spec-driven', ticketRegister: '../other.md' } }),
    /inside the project root/,
  )
})

test('the capture page keeps its small controls contextual', async () => {
  const root = await temporaryProject()
  const defaultPage = renderInboxPage(normalizeConfig(root))
  assert.match(defaultPage, /data-accent="blue"/)
  assert.match(defaultPage, /--page: #0f1115/)
  assert.match(defaultPage, /--paper: #fff/)
  assert.match(defaultPage, /prefers-color-scheme: light/)
  assert.match(defaultPage, /saved === 'light' \|\| saved === 'dark'/)
  assert.doesNotMatch(defaultPage, /--page: #171916/)

  const genericPage = renderInboxPage(normalizeConfig(root, {
    projectName: 'Paper trail', appearance: { accent: 'violet' },
  }))
  assert.match(genericPage, /<h1>Paper trail<\/h1>/)
  assert.match(genericPage, /data-accent="violet"/)
  assert.match(genericPage, /path: \/tmp\/project-inbox-/)
  assert.match(genericPage, /remove-image/)
  assert.match(genericPage, /overflow-x: auto/)
  assert.match(genericPage, /project-inbox-theme/)
  assert.match(genericPage, /navigator\.clipboard\.writeText\(id\)/)
  assert.match(genericPage, /copy\.className = 'copy-id'/)
  assert.match(genericPage, /reuseCapture\(entry\.id\)/)
  assert.match(genericPage, /messageLabel\.textContent = '> follow-up to ' \+ id/)
  assert.match(genericPage, /save as new capture ↵/)
  assert.match(genericPage, /sourceId: selectedCaptureId \|\| undefined/)
  assert.match(genericPage, /classList\.toggle\('reusing'/)
  assert.match(genericPage, /new File\(\[blob\]/)
  assert.doesNotMatch(genericPage, /<dialog/)
  assert.doesNotMatch(genericPage, /method: 'PATCH'/)
  assert.match(genericPage, /Raw notes and screenshots saved in inbox\//)
  assert.match(genericPage, /Status tracks how each capture has been processed/)
  assert.doesNotMatch(genericPage, /ticket states/)
  for (const script of [...genericPage.matchAll(/<script>([\s\S]*?)<\/script>/g)]) {
    assert.doesNotThrow(() => new Script(script[1]))
  }

  const specPage = renderInboxPage(normalizeConfig(root, { workflow: {
    profile: 'spec-driven', ticketRegister: 'docs/tickets.md',
  } }))
  assert.match(specPage, /href="\/workflow\/tickets"/)
  assert.match(specPage, /project tickets ↗/)
  assert.match(specPage, /Capture status tracks triage here; accepted changes are tracked separately/)
})

test('a message and screenshot become one workflow item', async () => {
  const root = await temporaryProject()
  const config = normalizeConfig(root, { workflow: { label: 'Ticket register' } })
  const result = await saveInboxEntry(config, {
    message: 'The visible state did not match the result.',
    imageDataUrl: ONE_PIXEL_PNG,
    originalName: 'clipboard.png',
  }, new Date('2026-08-09T10:11:12.000Z'), 'a1b2c3')

  assert.deepEqual(result, {
    id: 'INBOX-20260809-101112-a1b2c3',
    notePath: 'inbox/INBOX-20260809-101112-a1b2c3.md',
    imagePath: 'inbox/INBOX-20260809-101112-a1b2c3.png',
    imagePaths: ['inbox/INBOX-20260809-101112-a1b2c3.png'],
  })
  const note = await readFile(join(root, result.notePath), 'utf8')
  assert.match(note, /status: new/)
  assert.match(note, /workflow: "Ticket register"/)
  assert.match(note, /The visible state did not match the result\./)
  assert.deepEqual(await listInboxEntries(config), [{
    id: result.id,
    status: 'new',
    created: '2026-08-09T10:11:12.000Z',
    workflow: 'Ticket register',
    path: result.notePath,
    attachmentCount: 1,
  }])
})

test('message-only items work and malformed images are rejected', async () => {
  const root = await temporaryProject()
  const config = normalizeConfig(root)
  const result = await saveInboxEntry(config, { message: 'Remember this edge case.' }, new Date(), 'note')
  assert.equal(result.imagePath, null)
  assert.deepEqual(result.imagePaths, [])
  await assert.rejects(
    saveInboxEntry(config, { message: 'Not really PNG', imageDataUrl: 'data:image/png;base64,SGVsbG8=' }),
    /do not match/,
  )
})

test('follow-ups preserve completed captures and reopen the evidence under a new ID', async () => {
  const root = await temporaryProject()
  const config = normalizeConfig(root)
  const original = 'First observation.\n\n## Processing guidance\n\nThis heading is part of the message.'
  const result = await saveInboxEntry(config, { message: original, imageDataUrl: ONE_PIXEL_PNG }, new Date(), 'edit')
  assert.equal((await readInboxDetails(config, result.id)).message, original)
  const originalDocument = await readFile(join(root, result.notePath), 'utf8')
  await writeFile(join(root, result.notePath), originalDocument.replace('status: new', 'status: done'))

  const followUp = await saveInboxEntry(config, {
    message: 'Corrected observation.', sourceId: result.id, imageDataUrl: ONE_PIXEL_PNG,
  }, new Date('2026-08-09T10:11:12.000Z'), 'follow')
  assert.notEqual(followUp.id, result.id)
  assert.deepEqual(await readInboxDetails(config, result.id), {
    id: result.id, message: original, status: 'done', created: (await readInboxDetails(config, result.id)).created,
    workflow: 'Project workflow', source: null, attachmentCount: 1,
  })
  const followUpDetails = await readInboxDetails(config, followUp.id)
  assert.equal(followUpDetails.message, 'Corrected observation.')
  assert.equal(followUpDetails.status, 'new')
  assert.equal(followUpDetails.source, result.id)
  assert.equal(followUpDetails.attachmentCount, 1)
  await assert.rejects(saveInboxEntry(config, {
    message: 'Missing source.', sourceId: 'INBOX-20260809-101112-missing',
  }), /not found/)
})

test('one inbox item can preserve multiple screenshots', async () => {
  const root = await temporaryProject()
  const config = normalizeConfig(root)
  const result = await saveInboxEntry(config, {
    message: 'Compare these two states.',
    images: [
      { dataUrl: ONE_PIXEL_PNG, originalName: 'before.png' },
      { dataUrl: ONE_PIXEL_PNG, originalName: 'after.png' },
    ],
  }, new Date('2026-08-09T10:11:12.000Z'), 'pair')
  assert.deepEqual(result.imagePaths, [
    'inbox/INBOX-20260809-101112-pair.png',
    'inbox/INBOX-20260809-101112-pair-2.png',
  ])
  const note = await readFile(join(root, result.notePath), 'utf8')
  assert.match(note, /attachment: "INBOX-20260809-101112-pair.png"/)
  assert.match(note, /attachments: \["INBOX-20260809-101112-pair.png","INBOX-20260809-101112-pair-2.png"\]/)
  assert.equal((await listInboxEntries(config))[0].attachmentCount, 2)
  await assert.rejects(saveInboxEntry(config, {
    message: 'Too many.', images: Array.from({ length: 5 }, () => ({ dataUrl: ONE_PIXEL_PNG })),
  }), /no more than 4/)
})

test('a duplicate ID never removes an existing attachment', async () => {
  const root = await temporaryProject()
  const config = normalizeConfig(root)
  const now = new Date('2026-08-09T10:11:12.000Z')
  const first = await saveInboxEntry(config, { message: 'First.', imageDataUrl: ONE_PIXEL_PNG }, now, 'same')
  await assert.rejects(
    saveInboxEntry(config, { message: 'Second.', imageDataUrl: ONE_PIXEL_PNG }, now, 'same'),
    error => error.code === 'EEXIST',
  )
  assert.ok((await readFile(join(root, first.imagePath))).length > 0)
})

test('the inbox rejects symbolic links that escape the project root', async () => {
  const root = await temporaryProject()
  const outside = await temporaryProject()
  await symlink(outside, join(root, 'inbox'))
  await assert.rejects(
    saveInboxEntry(normalizeConfig(root), { message: 'Do not write outside.' }),
    /symbolic links/,
  )
})

test('the HTTP server is loopback-only and accepts an entry', async () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true)
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true)
  assert.equal(isLoopbackAddress('192.168.1.2'), false)

  const root = await temporaryProject()
  const { server, address } = await startInboxServer({ projectRoot: root, port: 0 })
  try {
    const origin = `http://127.0.0.1:${address.port}`
    const page = await fetch(`${origin}/inbox`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /Project inbox/)
    const response = await fetch(`${origin}/api/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Captured through HTTP.', imageDataUrl: ONE_PIXEL_PNG }),
    })
    assert.equal(response.status, 201)
    assert.match((await response.json()).id, /^INBOX-/)
    const listing = await fetch(`${origin}/api/entries`)
    assert.equal(listing.status, 200)
    const entries = (await listing.json()).entries
    assert.equal(entries.length, 1)
    const details = await fetch(`${origin}/api/entries/${entries[0].id}`)
    assert.equal(details.status, 200)
    assert.deepEqual(await details.json(), {
      id: entries[0].id,
      message: 'Captured through HTTP.',
      status: 'new',
      created: entries[0].created,
      workflow: 'Project workflow',
      source: null,
      attachmentCount: 1,
    })
    const followUpResponse = await fetch(`${origin}/api/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Follow-up through the composer.', sourceId: entries[0].id, imageDataUrl: ONE_PIXEL_PNG,
      }),
    })
    assert.equal(followUpResponse.status, 201)
    const followUpId = (await followUpResponse.json()).id
    const followUp = await fetch(`${origin}/api/entries/${followUpId}`)
    assert.equal(followUp.status, 200)
    assert.equal((await followUp.json()).source, entries[0].id)
    assert.equal((await fetch(`${origin}/api/entries/${entries[0].id}`, { method: 'PATCH' })).status, 405)
    const capture = await fetch(`${origin}/captures/${entries[0].id}`)
    assert.equal(capture.status, 200)
    assert.equal(capture.headers.get('content-type'), 'text/markdown; charset=utf-8')
    const originalDocument = await capture.text()
    assert.match(originalDocument, /Captured through HTTP\./)
    assert.doesNotMatch(originalDocument, /Follow-up through the composer\./)
    const attachment = await fetch(`${origin}/captures/${entries[0].id}/attachments/1`)
    assert.equal(attachment.status, 200)
    assert.equal(attachment.headers.get('content-type'), 'image/png')
    assert.ok((await attachment.arrayBuffer()).byteLength > 0)
    assert.equal((await fetch(`${origin}/captures/${entries[0].id}/attachments/4`)).status, 404)
    assert.equal((await fetch(`${origin}/captures/not-an-inbox-id`)).status, 404)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})

test('a SPEC-driven inbox exposes only its configured in-project ticket register', async () => {
  const root = await temporaryProject()
  await mkdir(join(root, 'docs'))
  await writeFile(join(root, 'docs', 'tickets.md'), '# Ticket states\n\n- FR-003: open\n')
  await writeFile(join(root, '.project-inbox.json'), JSON.stringify({
    workflow: { profile: 'spec-driven', ticketRegister: 'docs/tickets.md' },
  }))
  const { server, address } = await startInboxServer({ projectRoot: root, port: 0 })
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/workflow/tickets`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8')
    assert.match(await response.text(), /FR-003: open/)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }

  const outside = await temporaryProject()
  await writeFile(join(outside, 'tickets.md'), 'private')
  await rm(join(root, 'docs'), { recursive: true })
  await symlink(outside, join(root, 'docs'))
  const blocked = await startInboxServer({ projectRoot: root, port: 0 })
  try {
    const response = await fetch(`http://127.0.0.1:${blocked.address.port}/workflow/tickets`)
    assert.equal(response.status, 404)
    assert.match(await response.text(), /inside the project root/)
  } finally {
    await new Promise(resolve => blocked.server.close(resolve))
  }
})

test('the default port falls back but an explicit occupied port fails', async () => {
  const root = await temporaryProject()
  const blocker = createServer()
  let ownsDefaultPort = false
  try {
    await new Promise((resolve, reject) => {
      blocker.once('error', error => error.code === 'EADDRINUSE' ? resolve() : reject(error))
      blocker.listen(DEFAULT_PORT, '127.0.0.1', () => { ownsDefaultPort = true; resolve() })
    })
    const { server, address } = await startInboxServer({ projectRoot: root, fallbackOnInUse: true })
    try {
      assert.notEqual(address.port, DEFAULT_PORT)
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  } finally {
    if (ownsDefaultPort) await new Promise(resolve => blocker.close(resolve))
  }

  const exactBlocker = createServer()
  await new Promise(resolve => exactBlocker.listen(0, '127.0.0.1', resolve))
  const occupiedPort = exactBlocker.address().port
  try {
    await assert.rejects(
      startInboxServer({ projectRoot: root, port: occupiedPort, fallbackOnInUse: false }),
      error => error.code === 'EADDRINUSE',
    )
  } finally {
    await new Promise(resolve => exactBlocker.close(resolve))
  }
})
