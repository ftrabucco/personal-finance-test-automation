import type { TestInfo } from '@playwright/test'
import { randomUUID } from 'node:crypto'

export type E2EMetadata = {
  testRunId: string
  correlationId: string
  flowId: string
}

export type E2ETestContext = E2EMetadata & {
  dataPrefix: string
  entityName: (entity: string) => string
}

const HEADER_NAMES = {
  testRunId: 'x-e2e-test-run-id',
  correlationId: 'x-e2e-correlation-id',
  flowId: 'x-e2e-flow-id',
} as const

const moduleTestRunId = process.env.TEST_RUN_ID ?? `e2e-${timestamp()}-${shortId()}`

export function getTestRunId() {
  return moduleTestRunId
}

export function buildE2EHeaders(metadata?: E2EMetadata): Record<string, string> {
  if (!metadata) {
    return {}
  }

  return {
    [HEADER_NAMES.testRunId]: metadata.testRunId,
    [HEADER_NAMES.correlationId]: metadata.correlationId,
    [HEADER_NAMES.flowId]: metadata.flowId,
  }
}

export function createE2ETestContext(testInfo: TestInfo): E2ETestContext {
  const testRunId = getTestRunId()
  const flowId = extractFlowId(testInfo.title)
  const correlationId = [
    testRunId,
    flowId,
    sanitizeSegment(testInfo.project.name),
    `r${testInfo.retry}`,
    shortId(),
  ].join('-')
  const dataPrefix = `E2E-${flowId}-${shortId()}`

  return {
    testRunId,
    correlationId,
    flowId,
    dataPrefix,
    entityName: (entity: string) => `${dataPrefix}-${sanitizeSegment(entity)}-${Date.now()}`,
  }
}

export function extractFlowId(title: string) {
  const match = title.match(/\bCF-[A-Z]+-\d+\b/)

  return match?.[0] ?? 'CF-UNKNOWN'
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function shortId() {
  return randomUUID().slice(0, 8)
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
}
