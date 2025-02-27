import { Effect, Option, Schema } from "effect"
import type * as Model from "./Generated.js"
import { Prompt, PromptArgument, PromptMessage, TextContent } from "./Generated.js"

// Error types
export class PromptNotFoundError extends Schema.TaggedError<PromptNotFoundError>()("PromptNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

export class PromptValidationError extends Schema.TaggedError<PromptValidationError>()("PromptValidationError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

// Define a type for prompt definitions with validation schema
export class PromptDefinition<I, O> {
  constructor(
    readonly metadata: Prompt,
    readonly requestSchema: Schema.Schema<I, any>,
    readonly handler: (input: I) => Effect.Effect<O, PromptValidationError>
  ) {}

  // Helper to create a prompt definition
  static make<I, O>(
    metadata: Prompt,
    requestSchema: Schema.Schema<I, any>,
    handler: (input: I) => Effect.Effect<O, PromptValidationError>
  ) {
    return new PromptDefinition(metadata, requestSchema, handler)
  }

  // Process a request with this prompt definition
  process(args: Record<string, string> | undefined) {
    return Schema.decodeUnknown(this.requestSchema)(args || {}).pipe(
      Effect.andThen((input) => this.handler(input))
    )
  }
}

// Registry to simplify prompt registration and retrieval
export class PromptRegistry {
  private prompts = new Map<string, PromptDefinition<any, any>>()

  register<I, O>(definition: PromptDefinition<I, O>) {
    this.prompts.set(definition.metadata.name, definition)
    return this
  }

  get(name: string) {
    return this.prompts.get(name)
  }

  list() {
    return Array.from(this.prompts.values()).map((def) => def.metadata)
  }
}

// Define schema types for prompt arguments
export const ChatPrompt = PromptDefinition.make(
  // Metadata
  Prompt.make({
    name: "chat",
    description: Option.some("A simple chat prompt"),
    arguments: Option.some([
      PromptArgument.make({
        name: "topic",
        description: Option.some("The topic to chat about"),
        required: Option.some(true)
      })
    ])
  }),
  // Schema
  Schema.Struct({ topic: Schema.String }).annotations({
    identifier: "ChatPrompt"
  }),
  // Handler
  (input) =>
    Effect.succeed({
      messages: [
        PromptMessage.make({
          role: "user",
          content: TextContent.make({
            annotations: Option.none(),
            text: `Let's talk about ${input.topic}.`,
            type: "text"
          })
        })
      ]
    })
)

export const CodeGenerationPrompt = PromptDefinition.make(
  // Metadata
  Prompt.make({
    name: "code-generation",
    description: Option.some("Generate code based on requirements"),
    arguments: Option.some([
      PromptArgument.make({
        name: "language",
        description: Option.some("The programming language to use"),
        required: Option.some(true)
      }),
      PromptArgument.make({
        name: "description",
        description: Option.some("Description of what the code should do"),
        required: Option.some(true)
      }),
      PromptArgument.make({
        name: "complexity",
        description: Option.some("Desired complexity level (simple, medium, complex)"),
        required: Option.some(false)
      })
    ])
  }),
  // Schema
  Schema.Struct({
    language: Schema.String,
    description: Schema.String,
    complexity: Schema.optional(Schema.Union(
      Schema.Literal("simple"),
      Schema.Literal("medium"),
      Schema.Literal("complex")
    ))
  }).annotations({
    identifier: "CodeGenerationPrompt"
  }),
  // Handler
  (input) =>
    Effect.succeed({
      messages: [
        PromptMessage.make({
          role: "user",
          content: TextContent.make({
            annotations: Option.none(),
            text: `Write ${input.language} code that does the following: ${input.description}` +
              (input.complexity ? `\nComplexity level: ${input.complexity}` : ""),
            type: "text"
          })
        })
      ]
    })
)

export const SummarizePrompt = PromptDefinition.make(
  // Metadata
  Prompt.make({
    name: "summarize",
    description: Option.some("Summarize a text"),
    arguments: Option.some([
      PromptArgument.make({
        name: "text",
        description: Option.some("The text to summarize"),
        required: Option.some(true)
      }),
      PromptArgument.make({
        name: "length",
        description: Option.some("Desired summary length (short, medium, long)"),
        required: Option.some(false)
      })
    ])
  }),
  // Schema
  Schema.Struct({
    text: Schema.String,
    length: Schema.optional(Schema.Union(
      Schema.Literal("short"),
      Schema.Literal("medium"),
      Schema.Literal("long")
    ))
  }).annotations({
    identifier: "SummarizePrompt"
  }),
  // Handler
  (input) =>
    Effect.succeed({
      messages: [
        PromptMessage.make({
          role: "user",
          content: TextContent.make({
            annotations: Option.none(),
            text: `Please summarize the following text:` +
              (input.length ? `\nSummary length: ${input.length}` : "") +
              `\n\n${input.text}`,
            type: "text"
          })
        })
      ]
    })
)

export const DocumentationPrompt = PromptDefinition.make(
  // Metadata
  Prompt.make({
    name: "document-code",
    description: Option.some("Generate documentation for code"),
    arguments: Option.some([
      PromptArgument.make({
        name: "code",
        description: Option.some("The code to document"),
        required: Option.some(true)
      }),
      PromptArgument.make({
        name: "format",
        description: Option.some("Documentation format (JSDoc, TSDoc, etc.)"),
        required: Option.some(false)
      })
    ])
  }),
  // Schema
  Schema.Struct({
    code: Schema.String,
    format: Schema.optional(Schema.String)
  }).annotations({
    identifier: "DocumentationPrompt"
  }),
  // Handler
  (input) =>
    Effect.succeed({
      messages: [
        PromptMessage.make({
          role: "user",
          content: TextContent.make({
            annotations: Option.none(),
            text: `Please generate documentation for this code` +
              (input.format ? ` using ${input.format} format` : "") +
              `:\n\n\`\`\`\n${input.code}\n\`\`\``,
            type: "text"
          })
        })
      ]
    })
)

export const EffectCodePrompt = PromptDefinition.make(
  // Metadata
  Prompt.make({
    name: "effect-code",
    description: Option.some("Generate Effect code for a specific task"),
    arguments: Option.some([
      PromptArgument.make({
        name: "taskDescription",
        description: Option.some("Description of the task to implement"),
        required: Option.some(true)
      }),
      PromptArgument.make({
        name: "complexity",
        description: Option.some("Complexity level (simple, medium, advanced)"),
        required: Option.some(false)
      }),
      PromptArgument.make({
        name: "includeTests",
        description: Option.some("Whether to include tests (true/false)"),
        required: Option.some(false)
      }),
      PromptArgument.make({
        name: "includeComments",
        description: Option.some("Whether to include detailed comments (true/false)"),
        required: Option.some(false)
      })
    ])
  }),
  // Schema
  Schema.Struct({
    taskDescription: Schema.String,
    complexity: Schema.optional(Schema.Union(
      Schema.Literal("simple"),
      Schema.Literal("medium"),
      Schema.Literal("advanced")
    )),
    includeTests: Schema.optional(Schema.BooleanFromString),
    includeComments: Schema.optional(Schema.BooleanFromString)
  }).annotations({
    identifier: "EffectCodePrompt"
  }),
  // Handler
  (input) =>
    Effect.succeed({
      messages: [
        PromptMessage.make({
          role: "user",
          content: TextContent.make({
            annotations: Option.none(),
            text: `Generate TypeScript code using the Effect library for the following task:\n\n` +
              `Task description: ${input.taskDescription}\n\n` +
              (input.complexity ? `Complexity level: ${input.complexity}\n` : "") +
              `Requirements:\n` +
              `- Use Effect.gen for handling async operations\n` +
              `- Implement proper error handling with custom error types\n` +
              `- Follow functional programming principles\n` +
              `- Use appropriate Effect data types (Option, Either, etc.)\n` +
              (input.includeTests ? `- Include comprehensive tests for the implementation\n` : "") +
              (input.includeComments ? `- Include detailed comments explaining the code\n` : "") +
              `- Ensure the code is type-safe and well-structured`,
            type: "text"
          })
        }),
        PromptMessage.make({
          role: "assistant",
          content: TextContent.make({
            annotations: Option.none(),
            text:
              "I'll create a TypeScript implementation using the Effect library for your task. Let me break this down and structure a solution that follows functional programming principles.",
            type: "text"
          })
        })
      ]
    })
)

export class PromptProvider extends Effect.Service<PromptProvider>()("PromptProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Create prompt registry
    const registry = new PromptRegistry()

    // Method to register new prompts at runtime
    const registerPrompt = <I, O>(definition: PromptDefinition<I, O>) => {
      registry.register(definition)
      return Effect.succeed(true)
    }

    // Register chat prompt
    registry.register(ChatPrompt)

    // Register code generation prompt
    registry.register(CodeGenerationPrompt)

    // Register summarization prompt
    registry.register(SummarizePrompt)

    // Register documentation prompt
    registry.register(DocumentationPrompt)

    // Register Effect code generation prompt
    registry.register(EffectCodePrompt)

    // List all available prompts
    const list = Effect.succeed(registry.list())

    // Get and process a specific prompt
    const get = (request: Model.GetPromptRequest) =>
      Effect.gen(function*() {
        const name = request.params.name
        const promptDef = registry.get(name)

        if (!promptDef) {
          return yield* new PromptNotFoundError({
            cause: new Error(`Prompt not found: ${name}`),
            message: `Prompt '${request.params.name}' not found`
          })
        }

        // Get arguments
        const args = Option.getOrUndefined(request.params.arguments)

        // Process the prompt with the provided arguments
        const result = yield* promptDef.process(args)

        // Return result with the prompt metadata
        return {
          prompt: promptDef.metadata,
          messages: result.messages
        }
      }).pipe(
        Effect.mapError((cause) => {
          if (cause instanceof PromptValidationError) {
            return cause
          }
          return new PromptNotFoundError({
            cause,
            message: `Error getting prompt '${request.params.name}'`
          })
        })
      )

    return {
      list,
      get,
      registerPrompt
    } as const
  })
}) {}
