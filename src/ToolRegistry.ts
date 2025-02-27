import { Effect, Option, Schema } from "effect"
import { Tool, ToolError } from "./Domain/Tool.js"
import { CallToolResult, TextContent } from "./Generated.js"

// Error types
export class ToolValidationError extends Schema.TaggedError<ToolValidationError>()("ToolValidationError", {
  cause: Schema.Unknown,
  message: Schema.String,
  toolName: Schema.String
}) {}

// Define a type for tools with schema validation
export class ToolDefinition<I, O> {
  constructor(
    readonly metadata: Tool,
    readonly inputSchema: Schema.Schema<I, any>,
    readonly handler: (input: I) => Effect.Effect<O, ToolError | ToolValidationError>
  ) {}

  // Helper to create a tool definition
  static make<I, O>(
    metadata: Tool,
    inputSchema: Schema.Schema<I, any>,
    handler: (input: I) => Effect.Effect<O, ToolError | ToolValidationError>
  ) {
    return new ToolDefinition(metadata, inputSchema, handler)
  }

  // Process a tool call with validation
  process(args: Record<string, unknown> | undefined) {
    const { handler, inputSchema, metadata } = this

    return Schema.decodeUnknown(inputSchema)(args || {}).pipe(
      Effect.mapError((cause) =>
        new ToolValidationError({
          cause,
          message: `Invalid arguments for tool '${metadata.name}'`,
          toolName: metadata.name
        })
      ),
      Effect.flatMap((input) => handler(input)),
      Effect.withSpan("ToolDefinition.process", {
        attributes: { toolName: metadata.name }
      })
    )
  }
}

// Registry to simplify tool registration and retrieval
export class ToolRegistryImpl {
  private tools = new Map<string, ToolDefinition<any, any>>()

  register<I, O>(definition: ToolDefinition<I, O>) {
    this.tools.set(definition.metadata.name, definition)
    return this
  }

  get(name: string) {
    return this.tools.get(name)
  }

  list() {
    return Array.from(this.tools.values()).map((def) => def.metadata)
  }
}

// Define tool instances
export const GetNameTool = ToolDefinition.make(
  Tool.make({
    name: "GetName",
    description: Option.some("Get the current user's name"),
    inputSchema: {
      properties: Option.none(),
      required: Option.none(),
      type: "object"
    }
  }),
  Schema.Struct({}).annotations({ identifier: "GetNameInput" }),
  (_input) => Effect.succeed("Jonathan")
)

export const EchoTool = ToolDefinition.make(
  Tool.make({
    name: "Echo",
    description: Option.some("Echo back the input message"),
    inputSchema: {
      properties: Option.some({
        message: {
          type: "string"
        }
      }),
      required: Option.some(["message"]),
      type: "object"
    }
  }),
  Schema.Struct({
    message: Schema.String
  }).annotations({ identifier: "EchoInput" }),
  (input) => Effect.succeed(input.message)
)

export const CalculatorTool = ToolDefinition.make(
  Tool.make({
    name: "Calculator",
    description: Option.some("Evaluate a mathematical expression"),
    inputSchema: {
      properties: Option.some({
        expression: {
          type: "string"
        }
      }),
      required: Option.some(["expression"]),
      type: "object"
    }
  }),
  Schema.Struct({
    expression: Schema.String
  }).annotations({ identifier: "CalculatorInput" }),
  (input) =>
    Effect.try({
      try: () => {
        // Basic calculator - only handles simple expressions
        // In a real implementation, you'd want to use a proper math library with security checks
        const result = Function(`"use strict"; return (${input.expression})`)()
        return String(result)
      },
      catch: (error) =>
        new ToolError({
          message: `Failed to evaluate expression: ${error}`,
          cause: error
        })
    })
)

// Main tool registry service
export class ToolRegistry extends Effect.Service<ToolRegistry>()("ToolRegistry", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Create tool registry
    const registry = new ToolRegistryImpl()

    // Method to register new tools at runtime
    const registerTool = <I, O>(definition: ToolDefinition<I, O>) => {
      registry.register(definition)
      return Effect.succeed(true)
    }

    // Register built-in tools
    registry.register(GetNameTool)
    registry.register(EchoTool)
    registry.register(CalculatorTool)

    // List all available tools
    const list = Effect.succeed(registry.list()).pipe(
      Effect.withSpan("ToolRegistry.list")
    )

    // Find a tool by name
    const findByName = (name: string) =>
      Effect.sync(() => Option.fromNullable(registry.get(name))).pipe(
        Effect.flatMap(Option.match({
          onSome: (_) => Effect.succeed(_),
          onNone: () =>
            new ToolError({
              message: `Tool ${name} not found`
            })
        })),
        Effect.withSpan("ToolRegistry.findByName", {
          attributes: { toolName: name }
        })
      )

    // Call a tool with arguments
    const call = (request: { name: string; arguments?: Record<string, unknown> }) =>
      Effect.gen(function*() {
        const toolDef = yield* findByName(request.name)

        // Process the tool call with the provided arguments
        const result = yield* toolDef.process(request.arguments)

        // Format the result
        const content = typeof result === "string"
          ? TextContent.make({
            type: "text",
            text: result,
            annotations: Option.none()
          })
          : result

        // Convert to proper response format
        return CallToolResult.make({
          _meta: Option.none(),
          content: Array.isArray(content) ? content : [content],
          isError: Option.none()
        })
      }).pipe(
        // Handle errors
        Effect.catchAll((error) => {
          const errorMessage = error instanceof ToolError || error instanceof ToolValidationError
            ? error.message
            : `Error executing tool: ${error}`

          return Effect.succeed(
            CallToolResult.make({
              _meta: Option.none(),
              content: [
                TextContent.make({
                  type: "text",
                  text: errorMessage,
                  annotations: Option.none()
                })
              ],
              isError: Option.some(true)
            })
          )
        }),
        Effect.withSpan("ToolRegistry.call", {
          attributes: { toolName: request.name }
        })
      )

    return {
      register: registerTool,
      list,
      findByName,
      call
    } as const
  })
}) {}
