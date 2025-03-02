import { Effect, Either, JSONSchema, Option, Schema, SchemaAST } from "effect"
import type { EmbeddedResource, ImageContent } from "./Generated.js"
import { TextContent } from "./Generated.js"

// TypeId for domain models
export const TypeId: unique symbol = Symbol.for("Domain/Tool")
export type TypeId = typeof TypeId

// Schema definitions
export class ToolSchema extends Schema.Class<ToolSchema>("Domain/ToolSchema")({
  properties: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Object }), {
    as: "Option",
    exact: true
  }),
  required: Schema.optionalWith(Schema.Array(Schema.String).pipe(Schema.mutable), {
    as: "Option",
    exact: true
  }),
  type: Schema.Literal("object")
}, {
  description: "The JSON schema for the tool's input"
}) {
  static fromSchema = <S extends Schema.Schema.AnyNoContext>(schema: S) => {
    const jsonSchema = JSONSchema.make(schema)
    const name = SchemaAST.getJSONIdentifier(
      Schema.typeSchema(schema).ast
    ).pipe(Option.getOrElse(() => ""))

    const inputSchema = jsonSchema.$defs?.[name]
    if (!inputSchema) {
      throw new ToolError({
        message: `No input schema found for tool ${name}`
      })
    }

    return makeToolSchema({
      properties: (inputSchema as any).properties,
      required: (inputSchema as any).required
    })
  }
}

export const makeToolSchema = (params: {
  properties?: Record<string, object>
  required?: Array<string>
}): ToolSchema =>
  ToolSchema.make({
    properties: Option.fromNullable(params.properties),
    required: Option.fromNullable(params.required),
    type: "object"
  })

export class Tool extends Schema.Class<Tool>("Domain/Tool")({
  name: Schema.String,
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  inputSchema: ToolSchema
}) {
  readonly [TypeId] = TypeId

  static fromSchema = <S extends Schema.Schema.AnyNoContext>(schema: S) => {
    const name = SchemaAST.getJSONIdentifier(
      Schema.typeSchema(schema).ast
    ).pipe(Option.getOrElse(() => ""))

    const description = SchemaAST.getDescriptionAnnotation(
      Schema.typeSchema(schema).ast
    )

    return new Tool({
      name,
      description,
      inputSchema: ToolSchema.fromSchema(schema)
    })
  }
}

// Core domain error
export class ToolError extends Schema.TaggedError<ToolError>()("ToolError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

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
  process(args: Option.Option<Record<string, unknown>>) {
    const { handler, inputSchema, metadata } = this

    return Schema.decodeUnknown(inputSchema)(Option.getOrElse(args, () => {})).pipe(
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

const GetNameSchema = Schema.Struct({}).annotations({
  identifier: "GetNameInput",
  description: "Get the current user's name"
})

// Define tool instances
export const GetNameTool = ToolDefinition.make(
  Tool.fromSchema(GetNameSchema),
  GetNameSchema,
  (_input) => Effect.succeed("Jonathan")
)

const EchoSchema = Schema.Struct({
  message: Schema.String
}).annotations({
  identifier: "EchoInput",
  description: "Echo back the input message"
})

export const EchoTool = ToolDefinition.make(
  Tool.fromSchema(EchoSchema),
  EchoSchema,
  (input) => Effect.succeed(input.message)
)

const CalculatorSchema = Schema.Struct({
  expression: Schema.String
}).annotations({
  identifier: "CalculatorInput",
  description: "Evaluate a mathematical expression"
})

export const CalculatorTool = ToolDefinition.make(
  Tool.fromSchema(CalculatorSchema),
  CalculatorSchema,
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
    const call = (
      request: { name: string; arguments: Option.Option<Record<string, unknown>> }
    ): Effect.Effect<
      Either.Either<
        ReadonlyArray<TextContent | ImageContent | EmbeddedResource>,
        ReadonlyArray<TextContent | ImageContent | EmbeddedResource>
      >
    > =>
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

        return Either.right(
          Array.isArray(content) ? content : [content]
        )
      }).pipe(
        // Handle errors
        Effect.catchAll((error) => {
          const errorMessage = error instanceof ToolError || error instanceof ToolValidationError
            ? error.message
            : `Error executing tool: ${error}`

          return Effect.succeed(Either.left(
            [
              TextContent.make({
                type: "text",
                text: errorMessage,
                annotations: Option.none()
              })
            ]
          ))
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
