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
import { listInboxEntries, saveInboxEntry } from '../src/storage.mjs'

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
  const genericPage = renderInboxPage(normalizeConfig(root, { projectName: 'Paper trail' }))
  assert.match(genericPage, /<h1>Paper trail<\/h1>/)
  assert.match(genericPage, /path: \/tmp\/project-inbox-/)
  assert.match(genericPage, /remove-image/)
  assert.match(genericPage, /overflow-x: auto/)
  assert.match(genericPage, /project-inbox-theme/)
  assert.doesNotMatch(genericPage, /ticket states/)
  for (const script of [...genericPage.matchAll(/<script>([\s\S]*?)<\/script>/g)]) {
    assert.doesNotThrow(() => new Script(script[1]))
  }

  const specPage = renderInboxPage(normalizeConfig(root, { workflow: {
    profile: 'spec-driven', ticketRegister: 'docs/tickets.md',
  } }))
  assert.match(specPage, /href="\/workflow\/tickets"/)
  assert.match(specPage, /ticket states ↗/)
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
      body: JSON.stringify({ message: 'Captured through HTTP.' }),
    })
    assert.equal(response.status, 201)
    assert.match((await response.json()).id, /^INBOX-/)
    const listing = await fetch(`${origin}/api/entries`)
    assert.equal(listing.status, 200)
    assert.equal((await listing.json()).entries.length, 1)
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
