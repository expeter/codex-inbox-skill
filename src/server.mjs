import { randomInt } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { relative, resolve, sep } from 'node:path'
import { loadConfig } from './config.mjs'
import { renderInboxPage } from './page.mjs'
import { listInboxEntries, MAX_REQUEST_BYTES, saveInboxEntry } from './storage.mjs'

export const LOOPBACK_HOST = '127.0.0.1'
export const DEFAULT_PORT = 4783
export const FALLBACK_PORT_START = 4784
export const FALLBACK_PORT_END = 4883

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

async function readConfiguredProjectFile(projectRoot, configuredPath) {
  const root = await realpath(projectRoot)
  const file = await realpath(resolve(root, configuredPath))
  const path = relative(root, file)
  if (path.startsWith('..') || path.startsWith(sep)) {
    throw new Error('Configured ticket register must stay inside the project root.')
  }
  return readFile(file, 'utf8')
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
    if (size > MAX_REQUEST_BYTES) throw new Error('The submission is too large (44 MB maximum).')
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
    if (pathname === '/api/entries' && request.method === 'GET') {
      try {
        respondJson(response, 200, { entries: (await listInboxEntries(config)).slice(0, 20) })
      } catch (error) {
        respondJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to list inbox items.' })
      }
      return
    }
    if (pathname === '/workflow/tickets' && request.method === 'GET') {
      if (config.workflow.profile !== 'spec-driven' || !config.workflow.ticketRegister) {
        respond(response, 404, 'No ticket register is configured.')
        return
      }
      try {
        respond(
          response,
          200,
          await readConfiguredProjectFile(config.projectRoot, config.workflow.ticketRegister),
          'text/markdown; charset=utf-8',
        )
      } catch (error) {
        respond(response, 404, error instanceof Error ? error.message : 'Unable to read the ticket register.')
      }
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
    if (pathname === '/api/entries' || pathname === '/api/health' || pathname === '/workflow/tickets' || pathname === '/' || pathname.startsWith('/inbox')) {
      response.setHeader('Allow', pathname === '/api/entries' ? 'GET, POST' : 'GET')
      respond(response, 405, 'Method not allowed.')
      return
    }
    respond(response, 404, 'Not found.')
  })
  return { server, config }
}

function shuffledFallbackPorts() {
  const ports = Array.from(
    { length: FALLBACK_PORT_END - FALLBACK_PORT_START + 1 },
    (_, index) => FALLBACK_PORT_START + index,
  )
  for (let index = ports.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    ;[ports[index], ports[swap]] = [ports[swap], ports[index]]
  }
  return ports
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = error => { server.off('listening', onListening); reject(error) }
    const onListening = () => { server.off('error', onError); resolve() }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, LOOPBACK_HOST)
  })
}

export async function startInboxServer({ projectRoot, port = DEFAULT_PORT, fallbackOnInUse = false }) {
  const { server, config } = await createInboxServer({ projectRoot })
  try {
    await listen(server, port)
  } catch (error) {
    if (!fallbackOnInUse || port !== DEFAULT_PORT || error?.code !== 'EADDRINUSE') throw error
    let lastError = error
    for (const fallbackPort of shuffledFallbackPorts()) {
      try {
        await listen(server, fallbackPort)
        lastError = null
        break
      } catch (fallbackError) {
        lastError = fallbackError
        if (fallbackError?.code !== 'EADDRINUSE') throw fallbackError
      }
    }
    if (lastError) throw lastError
  }
  return { server, config, address: server.address() }
}
