import { randomBytes } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

export const MAX_REQUEST_BYTES = 44 * 1024 * 1024
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024
export const MAX_TOTAL_IMAGE_BYTES = 32 * 1024 * 1024
export const MAX_IMAGES = 4
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

function decodeImages(payload) {
  let candidates
  if (payload.images === undefined) {
    candidates = payload.imageDataUrl ? [{ dataUrl: payload.imageDataUrl, originalName: payload.originalName }] : []
  } else {
    if (!Array.isArray(payload.images)) throw new Error('images must be an array.')
    candidates = payload.images
  }
  if (candidates.length > MAX_IMAGES) throw new Error(`Add no more than ${MAX_IMAGES} screenshots.`)

  let totalBytes = 0
  return candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(`Screenshot ${index + 1} must be an object.`)
    }
    const image = decodeImage(candidate.dataUrl)
    if (!image) throw new Error(`Screenshot ${index + 1} is empty.`)
    totalBytes += image.bytes.length
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Screenshots are too large (32 MB combined maximum).')
    return { ...image, originalName: cleanOriginalName(candidate.originalName) }
  })
}

function staysInside(root, candidate) {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep))
}

async function safeInboxPath(config, { create }) {
  const root = await realpath(config.projectRoot)
  let current = root
  const segments = config.inboxDir.split(/[\\/]+/).filter(segment => segment && segment !== '.')

  for (const segment of segments) {
    const next = resolve(current, segment)
    let stats
    try {
      stats = await lstat(next)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      if (!create) return null
      await mkdir(next)
      stats = await lstat(next)
    }
    if (stats.isSymbolicLink()) throw new Error('inboxDir must not contain symbolic links.')
    if (!stats.isDirectory()) throw new Error('inboxDir must refer to a directory.')
    current = next
  }

  const resolved = await realpath(current)
  if (!staysInside(root, resolved)) throw new Error('inboxDir must stay inside the project root.')
  return resolved
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

  const images = decodeImages(payload)
  const safeToken = String(token).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'entry'
  const id = `INBOX-${compactTimestamp(now)}-${safeToken}`
  const imageNames = images.map((image, index) => `${id}${index ? `-${index + 1}` : ''}.${image.extension}`)
  const imageName = imageNames[0] ?? null
  const noteName = `${id}.md`
  const inboxPath = await safeInboxPath(config, { create: true })
  const notePath = resolve(inboxPath, noteName)
  const imagePaths = imageNames.map(name => resolve(inboxPath, name))
  const imagePath = imagePaths[0] ?? null
  const originalNames = images.map(image => image.originalName).filter(Boolean)
  const originalName = originalNames[0]
  const noteDocument = [
    '---',
    'project_inbox: 1',
    `id: ${yamlString(id)}`,
    'status: new',
    `created: ${yamlString(now.toISOString())}`,
    `project: ${yamlString(config.projectName)}`,
    `workflow: ${yamlString(config.workflow.label)}`,
    `workflow_profile: ${yamlString(config.workflow.profile)}`,
    ...(imageName ? [`attachment: ${yamlString(imageName)}`] : []),
    ...(imageNames.length ? [`attachments: ${yamlString(imageNames)}`] : []),
    ...(originalName ? [`original_name: ${yamlString(originalName)}`] : []),
    ...(originalNames.length ? [`original_names: ${yamlString(originalNames)}`] : []),
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

  const createdImagePaths = []
  try {
    for (const [index, image] of images.entries()) {
      await writeFile(imagePaths[index], image.bytes, { flag: 'wx' })
      createdImagePaths.push(imagePaths[index])
    }
    await writeFile(notePath, noteDocument, { flag: 'wx' })
  } catch (error) {
    await Promise.all(createdImagePaths.map(path => unlink(path).catch(() => {})))
    throw error
  }

  return {
    id,
    notePath: relative(config.projectRoot, notePath),
    imagePath: imagePath ? relative(config.projectRoot, imagePath) : null,
    imagePaths: imagePaths.map(path => relative(config.projectRoot, path)),
  }
}

function frontmatterValue(document, key) {
  const match = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(document)
  if (!match) return undefined
  try { return JSON.parse(match[1]) } catch { return match[1].trim() }
}

export async function listInboxEntries(config) {
  const inboxPath = await safeInboxPath(config, { create: false })
  if (!inboxPath) return []
  let names
  try {
    names = await readdir(inboxPath)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const noteNames = names.filter(name => /^INBOX-.*\.md$/.test(name)).sort().reverse()
  return Promise.all(noteNames.map(async name => {
    const document = await readFile(resolve(inboxPath, name), 'utf8')
    return {
      id: frontmatterValue(document, 'id') ?? name.slice(0, -3),
      status: frontmatterValue(document, 'status') ?? 'legacy',
      created: frontmatterValue(document, 'created') ?? null,
      workflow: frontmatterValue(document, 'workflow') ?? null,
      path: relative(config.projectRoot, resolve(inboxPath, name)),
    }
  }))
}
