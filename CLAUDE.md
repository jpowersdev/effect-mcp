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

## MCP Servers Usage Guidelines

### Memory Server
Use the Memory server to build a knowledge graph of project insights for easy reference.

#### When to Store Knowledge
- After understanding core architectural components
- When discovering important patterns or conventions
- When uncovering non-obvious dependencies between components
- After analyzing complex workflows or data flows
- When identifying reusable patterns or abstractions

#### Entity Structure
- **Component**: Core modules, classes, or services (e.g., `McpServer`, `SseTransport`)
- **Pattern**: Design patterns or idioms used in the codebase
- **Interface**: Important interfaces/contracts (e.g., `Transport`, `MessageBroker`)
- **Workflow**: Sequences of operations or process flows
- **Concept**: Abstract ideas or principles (e.g., `Effect`, `Layer`)

#### Relation Types
- `implements`: Component implements an Interface
- `depends_on`: Component requires another Component
- `follows`: Component adheres to a Pattern
- `part_of`: Component belongs to a larger Component or Workflow
- `extends`: Component builds upon another Component
- `alternative_to`: Component provides alternative functionality to another

#### Query Patterns
- Search for specific components by name
- Find all components implementing an interface
- Discover dependencies of a component
- Identify components following a particular pattern

### Repomix Server
Use Repomix for efficient code exploration and analysis of large sections of the codebase.