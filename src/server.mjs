import { createServer } from 'node:http'
import { loadConfig } from './config.mjs'
import { renderInboxPage } from './page.mjs'
import { MAX_REQUEST_BYTES, saveInboxEntry } from './storage.mjs'

export const LOOPBACK_HOST = '127.0.0.1'

export function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function responseHeaders(contentType) {
  return {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  }
}

function respond(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, responseHeaders(contentType))
  response.end(body)
}

function respondJson(response, status, body) {
  respond(response, status, JSON.stringify(body), 'application/json; charset=utf-8')
}

async function readJsonBody(request) {
  if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    throw new Error('Use application/json for inbox submissions.')
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_REQUEST_BYTES) throw new Error('The submission is too large (16 MB maximum).')
    chunks.push(bytes)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('The inbox submission is not valid JSON.')
  }
}

export async function createInboxServer({ projectRoot }) {
  const config = await loadConfig(projectRoot)
  const page = renderInboxPage(config)
  const server = createServer(async (request, response) => {
    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      respond(response, 403, 'Project Inbox is available only on localhost.')
      return
    }

    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if ((pathname === '/' || pathname === '/inbox' || pathname === '/inbox/') && request.method === 'GET') {
      respond(response, 200, page, 'text/html; charset=utf-8')
      return
    }
    if (pathname === '/api/health' && request.method === 'GET') {
      respondJson(response, 200, { ok: true, project: config.projectName, workflow: config.workflow.label })
      return
    }
    if (pathname === '/api/entries' && request.method === 'POST') {
      try {
        respondJson(response, 201, await saveInboxEntry(config, await readJsonBody(request)))
      } catch (error) {
        respondJson(response, 400, { error: error instanceof Error ? error.message : 'Unable to save inbox item.' })
      }
      return
    }
    if (pathname === '/api/entries' || pathname === '/api/health' || pathname === '/' || pathname.startsWith('/inbox')) {
      response.setHeader('Allow', pathname === '/api/entries' ? 'POST' : 'GET')
      respond(response, 405, 'Method not allowed.')
      return
    }
    respond(response, 404, 'Not found.')
  })
  return { server, config }
}

export async function startInboxServer({ projectRoot, port = 4783 }) {
  const { server, config } = await createInboxServer({ projectRoot })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, LOOPBACK_HOST, resolve)
  })
  return { server, config, address: server.address() }
}
