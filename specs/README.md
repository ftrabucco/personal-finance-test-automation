# Playwright Agent Specs

This directory stores human-readable test plans used by Playwright Test Agents.

## Recommended Flow

1. Use `playwright_test_planner` to explore staging and create or extend a plan in `specs/`.
2. Review the Markdown plan manually before generating code.
3. Use `playwright_test_generator` to generate draft tests from an approved plan.
4. Refactor generated drafts into the framework patterns before merging:
   - `@fixtures/test` for shared fixtures.
   - Page Objects in `src/pages`.
   - API clients in `src/api`.
   - Builders in `src/builders`.
   - Destructive guards from `src/config/safety`.
5. Use `playwright_test_healer` only for failing tests whose intended behavior is still valid.

## Seed

Use `tests/seed.spec.ts` as the starting point for agent exploration. It opens the app with an authenticated user on the dashboard.

Run it directly with:

```bash
npm run test:agent-seed
```

## Guardrails

- Generated tests are drafts until reviewed.
- Do not merge agent-generated code that bypasses POMs, fixtures, builders, or safety guards.
- Production remains read-only. Destructive plans/tests target staging or local only.
- Prefer accessible locators: role, label, placeholder, visible text.
- Keep setup/cleanup explicit and deterministic.
