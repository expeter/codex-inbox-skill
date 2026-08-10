#!/usr/bin/env node
import { resolve } from 'node:path'
import { loadConfig } from '../src/config.mjs'
import { startInboxServer } from '../src/server.mjs'
import { listInboxEntries } from '../src/storage.mjs'

function usage() {
  return `Project Inbox

Usage:
  project-inbox serve [--root <path>] [--port <number>]
  project-inbox list [--root <path>] [--json]

The server listens only on 127.0.0.1 and never starts an agent watcher.`
}

function parseArgs(argv) {
  const args = [...argv]
  const command = args[0] && !args[0].startsWith('-') ? args.shift() : 'serve'
  const options = { command, root: process.cwd(), port: 4783, json: false }
  while (args.length) {
    const flag = args.shift()
    if (flag === '--root') options.root = args.shift()
    else if (flag === '--port') options.port = Number(args.shift())
    else if (flag === '--json') options.json = true
    else if (flag === '--help' || flag === '-h') options.help = true
    else throw new Error(`Unknown option: ${flag}`)
  }
  if (!options.root) throw new Error('--root needs a path.')
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error('--port must be an integer from 0 to 65535.')
  }
  options.root = resolve(options.root)
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) { console.log(usage()); return }
  if (options.command === 'list') {
    const config = await loadConfig(options.root)
    const entries = await listInboxEntries(config)
    if (options.json) console.log(JSON.stringify(entries, null, 2))
    else if (!entries.length) console.log('Inbox is empty.')
    else for (const entry of entries) console.log(`${entry.status.padEnd(8)} ${entry.id}  ${entry.path}`)
    return
  }
  if (options.command !== 'serve') throw new Error(`Unknown command: ${options.command}`)

  const { server, config, address } = await startInboxServer({
    projectRoot: options.root,
    port: options.port,
  })
  const actualPort = typeof address === 'object' && address ? address.port : options.port
  console.log(`Project Inbox · ${config.projectName}`)
  console.log(`http://127.0.0.1:${actualPort}/inbox`)
  console.log(`Writes to ${config.inboxDir}/ · workflow: ${config.workflow.label}`)
  console.log('Capture only; automatic agent processing is off.')
  const stop = () => server.close(() => process.exit(0))
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

main().catch(error => {
  console.error(`Project Inbox: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
