# Defect Discovery Policy

## Purpose

Automation in this repo is not only for confirming expected behavior. It is also
used to discover product inconsistencies in the frontend, backend, API contracts,
data model, environment configuration, and user workflows.

When a test exposes an application issue, the issue should be recorded as a
product defect instead of hidden by weakening the assertion.

## Working Rule

While developing tests, always watch for:

- frontend behavior that contradicts the functional inventory or test plan;
- backend responses that contradict the API inventory or expected contract;
- inconsistent validation between UI and API;
- data created, updated, or deleted differently than expected;
- flaky behavior caused by product timing, missing loading states, or race conditions;
- environment issues that could hide real regressions.

## How To Record A Finding

Each confirmed product issue should be added to
[`../analysis/known-defects.md`](../analysis/known-defects.md).

Use this format:

```md
## BUG-YYYY-NNN - Short title

- Status: Open | Fixed | Won't Fix | Needs Analysis
- Severity: Critical | High | Medium | Low
- Area: Frontend | Backend | API | Environment | Data
- Found by: test/manual exploration/Playwright agent
- Related flow: CF-*
- Evidence:
- Expected:
- Actual:
- Proposed test:
- Tracking:
```

## Tests For Known Bugs

If the expected behavior is clear, create or draft the test that represents the
correct behavior, even when the application currently fails.

Use one of these approaches:

- **Failing test in a focused branch:** acceptable when the goal is to show the
  defect and the branch is not intended for green CI yet.
- **Skipped test with issue reference:** preferred when the defect should be
  documented without breaking CI.
- **Fix + test in product repos:** preferred when the issue is small enough to
  correct immediately.

Do not silently change an assertion to match broken product behavior.

## Naming Convention

Tests that document a known bug should include the bug id in the title or a
nearby comment:

```ts
test.skip('BUG-2026-001 CF-EXP-005 filters expenses by category', async () => {
  // Expected behavior documented in known-defects.md
})
```

When the bug is fixed, unskip the test and update the defect status to `Fixed`.

## Review Expectations

Pre-PR review should answer:

- Did the test reveal any product inconsistency?
- Was the inconsistency documented as a known defect?
- Is the expected behavior clear enough to automate?
- If a failing/skipped test was added, is it intentional and linked to a bug id?
