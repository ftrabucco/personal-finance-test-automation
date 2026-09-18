import { generateTestRunId } from '@utils/e2eObservability'

/**
 * Runs once in the main process before any worker is spawned. Setting
 * TEST_RUN_ID here (inherited by every worker process) is what makes it a
 * single id shared across the whole Playwright run, instead of each worker
 * generating its own when the module is first imported.
 */
export default async function globalSetup() {
  if (!process.env.TEST_RUN_ID) {
    process.env.TEST_RUN_ID = generateTestRunId()
  }
}
