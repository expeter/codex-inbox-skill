import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { loadConfig, normalizeConfig } from '../src/config.mjs'
import { isLoopbackAddress, startInboxServer } from '../src/server.mjs'
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
  await assert.rejects(
    saveInboxEntry(config, { message: 'Not really PNG', imageDataUrl: 'data:image/png;base64,SGVsbG8=' }),
    /do not match/,
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
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
