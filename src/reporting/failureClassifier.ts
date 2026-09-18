export type FailureCategory =
  | 'app-bug'
  | 'test-bug'
  | 'data-issue'
  | 'environment-issue'
  | 'infrastructure-issue'
  | 'unclassified'

export type ClassificationHint = {
  category: FailureCategory
  reason: string
}

type Rule = {
  pattern: RegExp
  category: FailureCategory
  reason: string
}

// Order matters: first match wins. These are heuristics for a first-pass
// triage, not a verdict — every generated report still asks for a manual
// final classification.
const RULES: Rule[] = [
  {
    pattern: /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|net::ERR_|getaddrinfo/i,
    category: 'infrastructure-issue',
    reason: 'Connection/network failure reaching the app, API, or environment.',
  },
  {
    pattern: /401|403|unauthorized|forbidden|invalid token|jwt/i,
    category: 'environment-issue',
    reason: 'Auth/session/token failure; check test user credentials and environment config.',
  },
  {
    pattern: /Timeout .* exceeded|waiting for (selector|locator|element)/i,
    category: 'test-bug',
    reason: 'Timeout waiting for a UI element; likely a selector, timing issue, or app regression. Verify manually.',
  },
  {
    pattern: /expect\(.*\)\.(toBe|toEqual|toMatch|toContain)\(.*status/i,
    category: 'app-bug',
    reason: 'Assertion on an HTTP status/response mismatch; check the API behavior.',
  },
  {
    pattern: /does not exist|column .* of relation|schema/i,
    category: 'environment-issue',
    reason: 'Looks like a database/schema mismatch between environments.',
  },
]

export function classifyFailure(errorMessage: string): ClassificationHint {
  const rule = RULES.find((candidate) => candidate.pattern.test(errorMessage))

  if (rule) {
    return { category: rule.category, reason: rule.reason }
  }

  return {
    category: 'unclassified',
    reason: 'No heuristic matched this error. Needs manual triage.',
  }
}
