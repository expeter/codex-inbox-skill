import { readFile } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve } from 'node:path'

export const CONFIG_FILE = '.project-inbox.json'
export const SPEC_DRIVEN_PROFILE = 'spec-driven'

const DEFAULT_TICKET_PREFIXES = ['FR', 'CR', 'BUG', 'SPEC']
const SPEC_DRIVEN_INSTRUCTIONS = 'Register a stable ticket before implementation. Read repository instructions and relevant specifications. Mark the inbox item triaged only after ticket registration, and done only after focused regression coverage and durable documentation are current. Record user-visible changes in the changelog, resolve completed work explicitly, commit verified work unless asked not to, and never push without an explicit request.'

export function defaultConfig(projectRoot) {
  return {
    projectName: basename(projectRoot),
    inboxDir: 'inbox',
    workflow: {
      profile: 'generic',
      label: 'Project workflow',
      instructions: 'Review the project instructions before acting on this item.',
      ticketPrefixes: [],
      repositoryInstructions: [],
      specifications: [],
      ticketRegister: null,
      milestones: null,
      changelog: null,
      focusedTestCommand: null,
    },
  }
}

function requiredString(value, fallback, field) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`)
  }
  return value.trim()
}

function optionalString(value, fallback, field) {
  if (value === undefined) return fallback
  if (value === null) return null
  return requiredString(value, fallback, field)
}

function stringList(value, fallback, field) {
  if (value === undefined) return [...fallback]
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of strings.`)
  return value.map((entry, index) => requiredString(entry, undefined, `${field}[${index}]`))
}

function relativeLocation(value, fallback, field) {
  const location = optionalString(value, fallback, field)
  if (location === null) return null
  if (isAbsolute(location) || relative('.', resolve('.', location)).startsWith('..')) {
    throw new Error(`${field} must be a relative path inside the project root.`)
  }
  return location
}

function relativeLocations(value, fallback, field) {
  return stringList(value, fallback, field).map((entry, index) => (
    relativeLocation(entry, undefined, `${field}[${index}]`)
  ))
}

export function normalizeConfig(projectRoot, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${CONFIG_FILE} must contain a JSON object.`)
  }

  const defaults = defaultConfig(projectRoot)
  const inboxDir = requiredString(input.inboxDir, defaults.inboxDir, 'inboxDir')
  const inboxPath = resolve(projectRoot, inboxDir)
  const relativeInboxPath = relative(projectRoot, inboxPath)
  if (isAbsolute(inboxDir) || relativeInboxPath.startsWith('..') || isAbsolute(relativeInboxPath)) {
    throw new Error('inboxDir must stay inside the project root.')
  }

  const workflow = input.workflow === undefined ? {} : input.workflow
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    throw new Error('workflow must be a JSON object.')
  }
  const profile = requiredString(workflow.profile, defaults.workflow.profile, 'workflow.profile')
  if (!['generic', SPEC_DRIVEN_PROFILE].includes(profile)) {
    throw new Error('workflow.profile must be "generic" or "spec-driven".')
  }
  const defaultPrefixes = profile === SPEC_DRIVEN_PROFILE ? DEFAULT_TICKET_PREFIXES : []
  const ticketPrefixes = stringList(workflow.ticketPrefixes, defaultPrefixes, 'workflow.ticketPrefixes')
    .map(prefix => prefix.toUpperCase())
  if (ticketPrefixes.some(prefix => !/^[A-Z][A-Z0-9-]{0,15}$/.test(prefix))) {
    throw new Error('workflow.ticketPrefixes entries must be short ticket prefixes.')
  }

  return {
    projectRoot,
    projectName: requiredString(input.projectName, defaults.projectName, 'projectName'),
    inboxDir: relativeInboxPath || '.',
    inboxPath,
    workflow: {
      profile,
      label: requiredString(workflow.label, defaults.workflow.label, 'workflow.label'),
      instructions: requiredString(
        workflow.instructions,
        profile === SPEC_DRIVEN_PROFILE ? SPEC_DRIVEN_INSTRUCTIONS : defaults.workflow.instructions,
        'workflow.instructions',
      ),
      ticketPrefixes: [...new Set(ticketPrefixes)],
      repositoryInstructions: relativeLocations(workflow.repositoryInstructions, [], 'workflow.repositoryInstructions'),
      specifications: relativeLocations(workflow.specifications, [], 'workflow.specifications'),
      ticketRegister: relativeLocation(workflow.ticketRegister, null, 'workflow.ticketRegister'),
      milestones: relativeLocation(workflow.milestones, null, 'workflow.milestones'),
      changelog: relativeLocation(workflow.changelog, null, 'workflow.changelog'),
      focusedTestCommand: optionalString(workflow.focusedTestCommand, null, 'workflow.focusedTestCommand'),
    },
  }
}

export async function loadConfig(projectRoot) {
  let input = {}
  try {
    input = JSON.parse(await readFile(resolve(projectRoot, CONFIG_FILE), 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      if (error instanceof SyntaxError) throw new Error(`${CONFIG_FILE} is not valid JSON.`)
      throw error
    }
  }
  return normalizeConfig(projectRoot, input)
}
