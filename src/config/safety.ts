import { getEnvironmentConfig } from './environment'

export function isDestructiveTestsAllowed() {
  const env = getEnvironmentConfig()

  return env.name !== 'prod' && env.allowDestructiveTests
}

export function requireDestructiveTestsAllowed() {
  const env = getEnvironmentConfig()

  if (env.name === 'prod') {
    throw new Error('Destructive tests are not allowed against production.')
  }

  if (!env.allowDestructiveTests) {
    throw new Error(
      'Destructive tests are disabled. Set ALLOW_DESTRUCTIVE_TESTS=true only in local or staging.',
    )
  }
}
