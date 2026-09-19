import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const TRIAGE_INPUT_DIR = process.env.TRIAGE_INPUT_DIR || 'triage-input'
const CONTEXT_DIR = process.env.TRIAGE_CONTEXT_DIR || 'orchestrator-context'
const MODEL = process.env.TRIAGE_MODEL || 'claude-sonnet-5'
const DRY_RUN = process.env.TRIAGE_DRY_RUN === 'true' || !process.env.ANTHROPIC_API_KEY
const MAX_LOG_CHARS = 20_000

const SYSTEM_PROMPT = `You are a senior QA/backend engineer doing first-pass root-cause triage for a
Playwright end-to-end test failure. You only get circumstantial evidence:
the failing test's own error, a window of staging backend logs, and a list
of recently merged pull requests. You do not have direct access to the app
or the ability to run more commands.

Rules:
- Only reason from the evidence given. Do not invent commits, log lines, or
  behavior that isn't in the provided context.
- If the evidence is insufficient to point at a cause, say so explicitly
  instead of guessing with false confidence.
- When a recent PR plausibly explains the failure, cite its number and title
  as evidence, not just as a suspicion.
- Classify each failure into exactly one category: app-bug, test-bug,
  data-issue, environment-issue, infrastructure-issue, or unclassified.
- Keep the tone factual and terse. This is read by an engineer doing triage,
  not a report for management.

For each failure, output a Markdown section with this shape:

### <test title>

- Category: <category>
- Confidence: <low|medium|high>
- Root cause hypothesis: <1-3 sentences>
- Supporting evidence:
  - <bullet citing a log line, PR, or explicit absence of evidence>
- Suggested next step: <one concrete action>
`

async function main() {
  const runDirs = findRunDirs(TRIAGE_INPUT_DIR)

  if (runDirs.length === 0) {
    console.log(`No triage summary.json found under ${TRIAGE_INPUT_DIR}. Nothing to do.`)
    return
  }

  const backendLogs = readOptional(path.join(CONTEXT_DIR, 'backend-logs.txt'))
  const frontendPrs = readOptionalJson(path.join(CONTEXT_DIR, 'frontend-prs.json'))
  const backendPrs = readOptionalJson(path.join(CONTEXT_DIR, 'backend-prs.json'))

  for (const runDir of runDirs) {
    const failures = JSON.parse(readFileSync(path.join(runDir, 'summary.json'), 'utf-8'))
    const prompt = buildUserPrompt(failures, backendLogs, frontendPrs, backendPrs)
    const outputPath = path.join(runDir, 'orchestrator-summary.md')

    if (DRY_RUN) {
      writeFileSync(
        outputPath,
        `# Orchestrator summary (dry run)\n\nNo ANTHROPIC_API_KEY / TRIAGE_DRY_RUN=true, so this is the assembled prompt instead of a real diagnosis.\n\n---\n\n${prompt}\n`,
      )
      console.log(`[dry run] Wrote assembled prompt to ${outputPath}`)
      continue
    }

    const markdown = await callClaude(prompt)
    writeFileSync(outputPath, `# Orchestrator root-cause summary\n\n${markdown}\n`)
    console.log(`Wrote root-cause summary to ${outputPath}`)
  }
}

function findRunDirs(root) {
  if (!existsSync(root)) {
    return []
  }

  const found = []
  const stack = [root]

  while (stack.length > 0) {
    const current = stack.pop()
    const entries = readdirSync(current)

    if (entries.includes('summary.json')) {
      found.push(current)
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry)
      if (statSync(full).isDirectory()) {
        stack.push(full)
      }
    }
  }

  return found
}

function readOptional(filePath) {
  if (!existsSync(filePath)) {
    return null
  }
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) {
    return null
  }
  return content.length > MAX_LOG_CHARS ? content.slice(-MAX_LOG_CHARS) : content
}

function readOptionalJson(filePath) {
  const raw = readOptional(filePath)
  if (!raw) {
    return []
  }
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function buildUserPrompt(failures, backendLogs, frontendPrs, backendPrs) {
  const failuresBlock = failures
    .map(
      (f) => `- Title: ${f.title}
  Flow: ${f.flowId}
  Correlation id: ${f.correlationId}
  File: ${f.file}
  Heuristic guess: ${f.classification?.category ?? 'unclassified'} (${f.classification?.reason ?? 'n/a'})
  Error: ${f.errorMessage}`,
    )
    .join('\n\n')

  const prsBlock = (label, prs) => {
    if (!prs || prs.length === 0) {
      return `${label}: no recent merged PRs available.`
    }
    return `${label}:\n${prs
      .map((pr) => `- #${pr.number} "${pr.title}" merged ${pr.mergedAt} by ${pr.author?.login ?? 'unknown'} (${pr.url})`)
      .join('\n')}`
  }

  return `## Failing tests in this run

${failuresBlock}

## Staging backend logs (most recent ${MAX_LOG_CHARS} chars, may be unrelated noise)

${backendLogs ?? 'No backend logs were captured for this run.'}

## Recent merged pull requests

${prsBlock('Frontend', frontendPrs)}

${prsBlock('Backend API', backendPrs)}

Produce one section per failing test as instructed.`
}

async function callClaude(userPrompt) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

await main()
