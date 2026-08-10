import { readFile } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve } from 'node:path'

export const CONFIG_FILE = '.project-inbox.json'

export function defaultConfig(projectRoot) {
  return {
    projectName: basename(projectRoot),
    inboxDir: 'inbox',
    workflow: {
      label: 'Project workflow',
      instructions: 'Review the project instructions before acting on this item.',
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

  return {
    projectRoot,
    projectName: requiredString(input.projectName, defaults.projectName, 'projectName'),
    inboxDir: relativeInboxPath || '.',
    inboxPath,
    workflow: {
      label: requiredString(workflow.label, defaults.workflow.label, 'workflow.label'),
      instructions: requiredString(
        workflow.instructions,
        defaults.workflow.instructions,
        'workflow.instructions',
      ),
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
