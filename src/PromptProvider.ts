import { Effect, Option, Schema } from "effect"
import type * as Model from "./Generated.js"
import { Prompt, PromptArgument, PromptMessage, TextContent } from "./Generated.js"

export class PromptNotFoundError extends Schema.TaggedError<PromptNotFoundError>()("PromptNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

export class PromptProvider extends Effect.Service<PromptProvider>()("PromptProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Store prompts by name
    const prompts = new Map<string, Prompt>()

    // Add some example prompts

    // 1. Simple chat prompt
    prompts.set(
      "chat",
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
      })
    )

    // List all available prompts
    const list = Effect.succeed(
      Array.from(prompts.values())
    )

    // Get a specific prompt by name
    const get = (request: Model.GetPromptRequest) =>
      Effect.gen(function*() {
        const name = request.params.name
        const prompt = prompts.get(request.params.name)
        if (!prompt) {
          throw new Error(`Prompt '${name}' not found`)
        }

        // For the chat prompt, generate some example messages
        if (name === "chat") {
          const topic = Option.map(request.params.arguments, (args) => args.topic)

          if (Option.isSome(topic)) {
            return {
              prompt,
              messages: [
                PromptMessage.make({
                  role: "user",
                  content: TextContent.make({
                    annotations: Option.none(),
                    text: `Let's talk about ${topic.value}.`,
                    type: "text"
                  })
                })
              ]
            }
          }
        }

        // Default case
        return {
          prompt,
          messages: []
        }
      }).pipe(
        Effect.mapError((cause) =>
          new PromptNotFoundError({
            cause,
            message: `Prompt '${request.params.name}' not found`
          })
        )
      )

    return {
      list,
      get
    } as const
  })
}) {}
