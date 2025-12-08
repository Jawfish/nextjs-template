# Project structuring

## TL;DR

- **Use domain/feature-first structure** (colocation)
- **Enforce dependency rules via tooling**, not folder hierarchy
- **Layer-first spreads related code across codebase** — almost universally disliked by experienced devs
- Keep `shared/` for genuinely cross-cutting code; don't preemptively extract

---

## Why Organize by Domain

- Groups code that changes together
- Debugging: problem → feature folder → done (vs jumping 5+ folders)
- Delete feature = delete folder (vs hunting across layers)
- High cohesion, low coupling (verified via dependency matrix analysis)
- "Screaming architecture" — structure reveals domain, not framework

---

## Recommended Structure

```
src/
├── domain/
│   ├── orders/
│   │   ├── types.ts
│   │   ├── repository.ts
│   │   ├── logic.ts
│   │   └── fulfillment/      # Submodule (see below)
│   │       ├── types.ts
│   │       └── service.ts
│   ├── products/
│   │   └── ...
│   └── users/
│       └── ...
├── lib/                       # Shared utilities
├── components/                # Shared UI components
└── app/                       # Entry point, routing
```

Structure should reveal **domain**, not **framework**:

```
# Bad (screams framework)          # Good (screams domain)
src/                               src/
├── controllers/                   ├── domain/
├── models/                        │   ├── orders/
├── views/                         │   ├── inventory/
├── services/                      │   └── payments/
└── repositories/                  └── lib/
```

---

## Key Principles

1. **Unidirectional dependencies** — no circular imports
2. **Public API pattern** — single export file controls visibility, never import internals
3. **Clear shared layer** — genuinely cross-cutting only, not "might reuse someday"
4. **Tooling > folder hierarchy** for enforcement
5. **Defer extraction** — keep code in domain until actually reused elsewhere

---

## Domain Dependency Linting

This repo includes a custom linter rule (`domain-dependencies`) that enforces cross-domain import rules at build time. Configure it in `domain-dependencies.json`:

```json
{
  "domainPath": "src/domain",
  "importAlias": "@/domain",
  "rootFiles": [],
  "dependencies": {
    "users": [],
    "products": [],
    "orders": ["users", "products"],
    "integration": ["*"]
  }
}
```

- Domains can always import from themselves (implicit)
- Imports from non-domain paths (lib, components, etc.) are always allowed
- Use `["*"]` for wildcard (e.g., integration test domains)
- Unknown domains fail closed (must be explicitly configured)

---

## Submodules

Submodules are nested directories within a domain that group related functionality but have no meaning outside the parent domain. They're treated as part of the parent for dependency purposes.

```
src/domain/
├── orders/
│   ├── types.ts              # Core order types
│   ├── repository.ts
│   └── fulfillment/          # Submodule: order fulfillment workflow
│       ├── types.ts          # Fulfillment-specific types
│       ├── logic.ts          # Fulfillment state machine
│       └── service.ts
└── payments/
    ├── types.ts
    └── refunds/              # Submodule: refund processing
        └── ...
```

**Dependency rules:**

1. **Submodule → Parent**: Submodules can import from their parent's root files
2. **Parent → Submodule**: Parent should NOT import from submodules — keeps the parent lean
3. **External → Submodule**: Domains that depend on the parent can also import from its submodules
4. **Sibling submodules**: Should not cross-import; shared code belongs in the parent

**When to use:**

- Functionality that's conceptually part of the domain but complex enough to warrant separation
- Code that external consumers might need independently

**When NOT to use:**

- If it could stand alone as its own domain, make it a domain
- If only the parent uses it, keep it as regular files in the parent

---

## Quick Decision Tree

```
Is it cross-cutting (auth, logging, UI primitives, HTTP client)?
  → lib/ or components/

Is it a business concept (User, Order, Product)?
  → domain/{concept}/

Is it a composed page/route/endpoint?
  → app/ or domain/ depending on complexity

Unsure where something goes?
  → Put it in the domain that uses it most; extract later if needed
```
