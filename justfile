init:
    chmod +x .githooks/*
    git config core.hooksPath .githooks
dev:
    bun run dev
test:
    bun run test
test-ui:
    bun run test:ui
build:
    bun run build
lint:
    bun run lint
    bun run typecheck
    bun run linter/cli.ts
coverage:
    bun run coverage
fix:
    bun fix

