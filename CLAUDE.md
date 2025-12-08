# Next.js Project

## Patterns

- Server Components by default; client only when interactive
- Server Actions for mutations; API routes only when inadequate
- Functional core, imperative shell — pure functions, side effects at edges
- No useEffect in client components — use custom hooks
- Branded types as value objects in domain layer, plain types in DB layer with mappers at boundary
- Result types for expected failures, throw for programmer errors
- 95% test coverage on .ts files; .tsx excluded from coverage rules but should still be tested to the extent possible/reasonable

### Branded Types

Branded types are TypeScript's approach to value objects — they prevent primitive obsession by making semantically distinct values incompatible at compile time.

```typescript
type UserId = Branded<string, "UserId">;
type OrderId = Branded<string, "OrderId">;

function getUser(id: UserId): User { /* ... */ }

const userId: UserId = "user_123" as UserId;
const orderId: OrderId = "order_456" as OrderId;

getUser(userId);   // ✓ compiles
getUser(orderId);  // ✗ type error — OrderId is not UserId
getUser("raw");    // ✗ type error — string is not UserId
```

**Why branded types over plain strings:**
- **Catch bugs at compile time** — can't accidentally pass an OrderId where UserId is expected
- **Self-documenting** — function signatures reveal intent (`UserId` vs `string`)
- **Refactoring safety** — compiler finds all places that need updating
- **Zero runtime cost** — brands exist only at compile time

**Guidelines:**
- Use branded types in the domain layer for IDs, validated strings (Email, Url), and constrained values
- Use plain types in the database layer — brand/unbrand at repository boundaries
- Create brands via factory functions that validate: `Email.parse(input)` returns `Result<Email, ValidationError>`

## Structure

Organize by domain, not technical layer. Loose coupling, dependency inversion.

## Code Style

### Fail Fast

- Fail immediately and visibly; no silent defaults or swallowed errors
- Assertions over comments — document invariants in code, not prose
- Informative error messages with context (what failed, where, why)
- Validate at boundaries (user input, external APIs); internal code trusts validated data

Relevant documentation:

- ./docs/fail_fast_one.md
- ./docs/fail_fast_two.md
- ./docs/tiger_style.md

### Components

- Lift state up — single source of truth in closest common ancestor
- Controlled components — prefer props over internal state
- Compound components for related UI sharing implicit state (tabs, accordions)
- **Always wrap shadcn/ui components** — never import directly from `@/shadcn/components/ui/*`; instead import from `@/components/ui`. Create thin wrappers in `src/components/ui/` that re-export shadcn components. This provides a single point of customization and decouples app code from the underlying component library.

### Documentation

- Write high-quality JSDoc comments for all functions and methods

### Accessibility

- Design with accessibility first — proper labels, roles, ARIA attributes
- Accessible UI enables semantic test selectors (role, label, text) over brittle test IDs

## Testing

- Plain English test names describing behavior: "empty cart has zero total"
- ACE framework: Action, Condition, Expectation
- No mocks — use test doubles with real behavior
- Every time we encounter a bug: write a test that fails with the bug, then fix the bug so the test passes

### Integration Testing

- **testcontainers** (`@testcontainers/postgresql`) for real Postgres in tests
- **Repository factory pattern** — inject db for testing, cached wrappers for production
- **Nullables pattern** — server actions accept deps (repo, revalidate) with defaults; tests inject no-ops
- See `repository.ts` and `actions.ts` for examples

Relevant documentation:

- ./docs/writing_testable_code.md
- ./docs/no_mocks_in_tests.md
- ./docs/naming_tests.md

### Coverage Ignores

When defensive code is genuinely unreachable (e.g., a null check after validation that guarantees non-null), use selective v8 ignore comments rather than excluding entire files from coverage in `vitest.config.ts`.

**Syntax** (the `@preserve` is required to prevent esbuild from stripping the comment):

```typescript
/* v8 ignore next -- @preserve reason why this is unreachable */
if (!value) return;

/* v8 ignore next 3 -- @preserve reason */
if (!value) {
  return err('unreachable');
}
```

**Rules:**
- Always explain why the code is being ignored
- Prefer selective ignores over excluding files from coverage
- Only ignore when code is truly unreachable or untestable without resorting to mocks
- File-level exclusions in `vitest.config.ts` are reserved for entire categories (e.g., server actions, client hooks, cached wrappers)

### Important code style documentation

- ./docs/module_oriented_design.md
- ./docs/project_structuring.md (note: this has some good ideas but we should adjust to adhere to Next.js conventions)
- ./docs/modular_monolith.md
- ./docs/easy_to_change.md
- ./docs/over_encapsulation.md
- ./docs/abstraction.md
- ./docs/twelve_factors

## MCP

Dev server runs on port 3000. Use `nextjs_call` with this port for runtime diagnostics:

    mcp__next-devtools__nextjs_call(port: "3000", toolName: "get_errors")
    mcp__next-devtools__nextjs_call(port: "3000", toolName: "get_routes")
    mcp__next-devtools__nextjs_call(port: "3000", toolName: "get_logs")

Logs are at `.next/dev/logs/next-development.log` (unified server + browser).

## Logging

Use `console.log` liberally during development. Logs are cheap and aid debugging — don't be shy about adding them when investigating issues. Use appropriate levels:

- `console.debug` / `console.trace` — verbose diagnostic detail (trace includes stack)
- `console.info` — routine events
- `console.warn` — recoverable issues
- `console.error` — failures
- `console.assert` — validate invariants (logs only when condition is falsy); use liberally
