import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type TestEnvironment = 'local' | 'staging' | 'prod'

export interface EnvironmentConfig {
  name: TestEnvironment
  baseUrl: string
  apiUrl: string
  allowDestructiveTests: boolean
  user: {
    email?: string
    password?: string
  }
}

let envFileLoaded = false

function loadDotEnvFile() {
  if (envFileLoaded) return
  envFileLoaded = true

  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function readEnv(name: string): string | undefined {
  loadDotEnvFile()

  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

function readBooleanEnv(name: string): boolean {
  return readEnv(name)?.toLowerCase() === 'true'
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const name = (readEnv('TEST_ENV') || 'local') as TestEnvironment

  if (!['local', 'staging', 'prod'].includes(name)) {
    throw new Error(`Unsupported TEST_ENV "${name}". Expected local, staging or prod.`)
  }

  const baseUrl =
    name === 'prod'
      ? readEnv('E2E_PROD_BASE_URL') || readEnv('E2E_BASE_URL')
      : readEnv('E2E_BASE_URL')

  const apiUrl =
    name === 'prod'
      ? readEnv('E2E_PROD_API_URL') || readEnv('E2E_API_URL')
      : readEnv('E2E_API_URL')

  if (!baseUrl) {
    throw new Error('Missing E2E_BASE_URL or E2E_PROD_BASE_URL.')
  }

  if (!apiUrl) {
    throw new Error('Missing E2E_API_URL or E2E_PROD_API_URL.')
  }

  return {
    name,
    baseUrl,
    apiUrl,
    allowDestructiveTests: readBooleanEnv('ALLOW_DESTRUCTIVE_TESTS'),
    user: {
      email: readEnv('E2E_USER_EMAIL'),
      password: readEnv('E2E_USER_PASSWORD'),
    },
  }
}

export function requireTestUser() {
  const env = getEnvironmentConfig()

  if (!env.user.email || !env.user.password) {
    throw new Error('Missing E2E_USER_EMAIL or E2E_USER_PASSWORD.')
  }

  return {
    email: env.user.email,
    password: env.user.password,
  }
}
