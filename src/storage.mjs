import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

export const MAX_REQUEST_BYTES = 22 * 1024 * 1024
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024
export const MAX_MESSAGE_LENGTH = 4_000

const IMAGE_TYPES = new Map([
  ['image/png', { extension: 'png', signature: bytes => bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) }],
  ['image/jpeg', { extension: 'jpg', signature: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9 }],
  ['image/gif', { extension: 'gif', signature: bytes => ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')) }],
  ['image/webp', { extension: 'webp', signature: bytes => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' }],
])

function compactTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
}

function decodeImage(dataUrl) {
  if (dataUrl === undefined || dataUrl === null || dataUrl === '') return null
  if (typeof dataUrl !== 'string') throw new Error('The screenshot must be an image data URL.')

  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
  if (!match) throw new Error('Use a PNG, JPEG, WebP, or GIF screenshot.')

  const type = IMAGE_TYPES.get(match[1])
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!bytes.length) throw new Error('The screenshot is empty.')
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('The screenshot is too large (16 MB maximum).')
  if (!type.signature(bytes)) throw new Error('The screenshot contents do not match its image type.')
  return { bytes, extension: type.extension }
}

function cleanOriginalName(name) {
  if (!name) return undefined
  if (typeof name !== 'string') throw new Error('The original filename must be text.')
  return name.replace(/[\r\n]/g, ' ').slice(0, 180)
}

function yamlString(value) {
  return JSON.stringify(value)
}

export async function saveInboxEntry(config, payload, now = new Date(), token = randomBytes(3).toString('hex')) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The inbox submission must be a JSON object.')
  }
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (!message) throw new Error('Add a short message before submitting.')
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Keep the message under ${MAX_MESSAGE_LENGTH} characters.`)
  }

  const image = decodeImage(payload.imageDataUrl)
  const safeToken = String(token).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'entry'
  const id = `INBOX-${compactTimestamp(now)}-${safeToken}`
  const imageName = image ? `${id}.${image.extension}` : null
  const noteName = `${id}.md`
  const notePath = resolve(config.inboxPath, noteName)
  const imagePath = imageName ? resolve(config.inboxPath, imageName) : null
  const originalName = cleanOriginalName(payload.originalName)
  const noteDocument = [
    '---',
    'project_inbox: 1',
    `id: ${yamlString(id)}`,
    'status: new',
    `created: ${yamlString(now.toISOString())}`,
    `project: ${yamlString(config.projectName)}`,
    `workflow: ${yamlString(config.workflow.label)}`,
    ...(imageName ? [`attachment: ${yamlString(imageName)}`] : []),
    ...(originalName ? [`original_name: ${yamlString(originalName)}`] : []),
    '---',
    '',
    `# ${id}`,
    '',
    '## Message',
    '',
    message,
    '',
    '## Processing guidance',
    '',
    config.workflow.instructions,
    '',
  ].join('\n')

  await mkdir(config.inboxPath, { recursive: true })
  try {
    if (image && imagePath) await writeFile(imagePath, image.bytes, { flag: 'wx' })
    await writeFile(notePath, noteDocument, { flag: 'wx' })
  } catch (error) {
    if (imagePath) await unlink(imagePath).catch(() => {})
    throw error
  }

  return {
    id,
    notePath: relative(config.projectRoot, notePath),
    imagePath: imagePath ? relative(config.projectRoot, imagePath) : null,
  }
}

function frontmatterValue(document, key) {
  const match = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(document)
  if (!match) return undefined
  try { return JSON.parse(match[1]) } catch { return match[1].trim() }
}

export async function listInboxEntries(config) {
  let names
  try {
    names = await readdir(config.inboxPath)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const noteNames = names.filter(name => /^INBOX-.*\.md$/.test(name)).sort().reverse()
  return Promise.all(noteNames.map(async name => {
    const document = await readFile(resolve(config.inboxPath, name), 'utf8')
    return {
      id: frontmatterValue(document, 'id') ?? name.slice(0, -3),
      status: frontmatterValue(document, 'status') ?? 'legacy',
      created: frontmatterValue(document, 'created') ?? null,
      workflow: frontmatterValue(document, 'workflow') ?? null,
      path: relative(config.projectRoot, resolve(config.inboxPath, name)),
    }
  }))
}
