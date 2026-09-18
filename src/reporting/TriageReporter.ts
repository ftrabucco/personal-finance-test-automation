import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { extractFlowId, getTestRunId } from '@utils/e2eObservability'
import { classifyFailure, type ClassificationHint } from './failureClassifier'

type FailureRecord = {
  title: string
  file: string
  project: string
  retry: number
  status: string
  durationMs: number
  testRunId: string
  correlationId: string
  flowId: string
  errorMessage: string
  errorStack?: string
  classification: ClassificationHint
  artifacts: string[]
  detailFile: string
}

const FAILING_STATUSES = new Set(['failed', 'timedOut', 'interrupted'])

/**
 * Collects failing tests from a run into `triage/<testRunId>/`: one
 * self-contained folder per run with the original artifacts (trace, video,
 * screenshot, error-context.md) copied next to a diagnosis Markdown per
 * failure, plus an index. Writes nothing when the run is fully green.
 */
export default class TriageReporter implements Reporter {
  private readonly failures: FailureRecord[] = []

  // Read lazily instead of caching at construction time: Playwright builds
  // reporter instances before globalSetup runs, so a field initializer here
  // would freeze in a stale, pre-globalSetup TEST_RUN_ID.
  private get runId() {
    return getTestRunId()
  }

  private get runDir() {
    return path.join(process.cwd(), 'triage', this.runId)
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (!FAILING_STATUSES.has(result.status)) {
      return
    }

    this.failures.push(this.buildRecord(test, result))
  }

  onEnd() {
    if (this.failures.length === 0) {
      return
    }

    mkdirSync(this.runDir, { recursive: true })

    for (const record of this.failures) {
      writeFileSync(path.join(this.runDir, record.detailFile), renderDetailMarkdown(record))
    }

    writeFileSync(path.join(this.runDir, 'index.md'), this.renderIndexMarkdown())
    writeFileSync(path.join(this.runDir, 'summary.json'), JSON.stringify(this.failures, null, 2))

    const indexPath = path.relative(process.cwd(), path.join(this.runDir, 'index.md'))
    console.log(`\nTriage: ${this.failures.length} failing test(s) captured in ${indexPath}\n`)
  }

  private buildRecord(test: TestCase, result: TestResult): FailureRecord {
    const flowIdFromTitle = extractFlowId(test.title)
    const slug = sanitize(`${flowIdFromTitle}-${test.title}-r${result.retry}-w${result.workerIndex}`)
    const testDir = path.join(this.runDir, slug)

    let testRunId = this.runId
    let correlationId = 'unknown'
    let flowId = flowIdFromTitle
    const artifacts: string[] = []

    for (const attachment of result.attachments) {
      if (attachment.name === 'e2e-metadata' && attachment.body) {
        const parsed = parseE2EMetadata(attachment.body.toString('utf-8'))
        if (parsed) {
          testRunId = parsed.testRunId
          correlationId = parsed.correlationId
          flowId = parsed.flowId
        }
        continue
      }

      if (!attachment.path) {
        continue
      }

      mkdirSync(testDir, { recursive: true })
      const destination = path.join(testDir, `${attachment.name}${path.extname(attachment.path)}`)
      try {
        copyFileSync(attachment.path, destination)
        artifacts.push(path.relative(this.runDir, destination))
      } catch {
        // Source artifact may have been cleaned up already; skip it.
      }
    }

    const error = result.errors[0]
    const errorMessage = stripAnsi(error?.message ?? 'No error message captured.')

    return {
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      project: test.parent.project()?.name ?? 'unknown',
      retry: result.retry,
      status: result.status,
      durationMs: result.duration,
      testRunId,
      correlationId,
      flowId,
      errorMessage,
      errorStack: error?.stack ? stripAnsi(error.stack) : undefined,
      classification: classifyFailure(errorMessage),
      artifacts,
      detailFile: `${slug}.md`,
    }
  }

  private renderIndexMarkdown(): string {
    const rows = this.failures
      .map(
        (f) =>
          `| ${f.flowId} | ${f.title} | ${f.project} | ${f.status} | ${f.classification.category} | [detalle](./${f.detailFile}) |`,
      )
      .join('\n')

    return [
      `# Triage - ${this.runId}`,
      '',
      `${this.failures.length} failing test(s).`,
      '',
      '| Flow | Test | Project | Status | Suggested category | Detail |',
      '| --- | --- | --- | --- | --- | --- |',
      rows,
      '',
    ].join('\n')
  }
}

function renderDetailMarkdown(record: FailureRecord): string {
  const stackSection = record.errorStack
    ? `<details><summary>Stack trace</summary>\n\n\`\`\`\n${record.errorStack}\n\`\`\`\n\n</details>\n`
    : ''
  const artifactsSection = record.artifacts.length
    ? record.artifacts.map((artifact) => `- \`${artifact}\``).join('\n')
    : '- No artifacts captured.'

  return [
    `# ${record.title}`,
    '',
    `- Status: ${record.status}`,
    `- File: ${record.file}`,
    `- Project: ${record.project}`,
    `- Retry: ${record.retry}`,
    `- Duration: ${record.durationMs}ms`,
    `- Flow: ${record.flowId}`,
    `- Correlation id: ${record.correlationId}`,
    `- Test run id: ${record.testRunId}`,
    '',
    '## Suggested classification',
    '',
    `- Category: ${record.classification.category}`,
    `- Reason: ${record.classification.reason}`,
    '- Final classification: _(fill in manually)_',
    '',
    '## Error',
    '',
    '```',
    record.errorMessage,
    '```',
    '',
    stackSection,
    '## Artifacts',
    '',
    artifactsSection,
    '',
  ].join('\n')
}

function parseE2EMetadata(raw: string): { testRunId: string; correlationId: string; flowId: string } | undefined {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.testRunId === 'string' && typeof parsed.correlationId === 'string' && typeof parsed.flowId === 'string') {
      return parsed
    }
    return undefined
  } catch {
    return undefined
  }
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

function stripAnsi(value: string) {
  return value.replace(/\x1b\[[0-9;]*m/g, '')
}
