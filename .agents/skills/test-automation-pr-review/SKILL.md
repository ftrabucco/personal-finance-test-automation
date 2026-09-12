---
name: test-automation-pr-review
description: Use before pushing commits or opening pull requests in this Playwright test automation repo to review code quality, architecture, safety guards, generated Playwright agent output, and validation readiness.
---

# Test Automation PR Review

Run this skill before push/PR, or whenever the user asks for a review of automation changes.

## Workflow

1. Inspect branch and diff:
   - `git status --short --branch`
   - `git diff --stat`
   - `git diff --cached --stat` when files are staged
   - targeted `git diff` for changed files
2. Read `docs/strategy/pr-review-checklist.md`.
3. Review findings in this order:
   - safety blockers
   - broken behavior or likely flakiness
   - architecture/pattern drift
   - missing validation or docs
4. Recommend or run validations appropriate to the diff.
5. If no issues are found, say that clearly and list residual risk.

## Standards

- Tests should express business intent and delegate mechanics to Page Objects, fixtures, API clients, builders, and assertion helpers.
- Destructive tests must be blocked in production and require explicit opt-in.
- Cleanup must be deterministic and robust if assertions fail mid-test.
- Prefer accessible Playwright locators.
- Avoid sleeps, `networkidle`, duplicated selectors, hardcoded credentials, hardcoded catalog IDs, and mutation against production.
- Playwright agent-generated code is draft code until adapted to this framework.

## Output Format

Lead with findings:

```text
Findings
- [P1] ...

Open Questions
- ...

Validation
- ...

Summary
- ...
```

If there are no findings:

```text
Findings
- No blocking issues found.

Validation
- ...

Residual Risk
- ...
```
