# MCP Server Development Guide

## Build & Development Commands
- `pnpm build` - Build the project with tsup
- `pnpm dev` - Start development server with nodemon
- `pnpm check` - Run TypeScript type checking
- `pnpm test` - Run all tests with vitest
- `pnpm test <test-name>` - Run specific test
- `pnpm coverage` - Run tests with coverage
- `pnpm circular` - Check for circular dependencies
- `pnpm clean` - Clean build artifacts
- `pnpm codegen` - Generate code from schemas

## Code Style Guidelines
- **Formatting**: 2-space indentation, 120 character line width, double quotes
- **Syntax**: No semicolons (ASI style), arrow functions require parentheses
- **Imports**: Use TypeScript's import type syntax for type imports
- **Types**: Use generic array syntax `Array<T>` rather than `T[]`
- **Naming**: CamelCase for variables/functions, PascalCase for types/classes
- **Error Handling**: Use Effect's error handling (`Either`, `Option`, etc.)
- **Variables**: Prefix unused variables with underscore
- **Destructuring**: Sort keys alphabetically (enforced by ESLint)
- **Organization**: Avoid circular dependencies between modules