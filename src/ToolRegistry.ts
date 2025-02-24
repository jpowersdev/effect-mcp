import { Effect, Match, Option } from "effect"
import { Tool, ToolError } from "./Domain/Tool.js"
import type { TextContent } from "./Generated.js"

// Request/Response types
export interface ToolCallRequest {
  name: string
  args: Record<string, unknown>
}

export interface ToolCallResult {
  content: Array<TextContent>
  isError: Option.Option<boolean>
}

export class ToolRegistry extends Effect.Service<ToolRegistry>()("ToolRegistry", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // In-memory tool storage
    const tools = new Map<string, Tool>()

    // Built-in tools
    const getNameTool = Tool.make({
      name: "GetName",
      description: "Get the current user's name",
      inputSchema: {
        properties: {},
        required: []
      }
    })

    // Initialize with built-in tools
    tools.set(getNameTool.name, getNameTool)

    const register = (tool: Tool) =>
      Effect.sync(() => {
        tools.set(tool.name, tool)
      }).pipe(
        Effect.withSpan("ToolRegistry.register", {
          attributes: { toolName: tool.name }
        })
      )

    const list = Effect.sync(() => Array.from(tools.values())).pipe(
      Effect.tap((tools) =>
        Effect.log("tools").pipe(
          Effect.annotateLogs({ tools })
        )
      ),
      Effect.withSpan("ToolRegistry.list")
    )

    const findByName = (name: string) =>
      Effect.sync(() => Option.fromNullable(tools.get(name))).pipe(
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

    const call = ({ name }: ToolCallRequest) =>
      Effect.gen(function*() {
        const tool = yield* findByName(name)

        // Tool-specific implementations
        const result = Match.value(tool.name).pipe(
          Match.when("GetName", () => Effect.succeed("Jonathan")),
          Match.orElse(() =>
            Effect.fail(
              new ToolError({
                message: `No implementation for tool ${name}`
              })
            )
          )
        )

        const content = yield* result.pipe(
          Effect.map((text) => ({
            type: "text" as const,
            text,
            annotations: Option.none()
          }))
        )

        return {
          content: [content],
          isError: Option.none()
        }
      }).pipe(
        Effect.withSpan("ToolRegistry.call", {
          attributes: { toolName: name }
        })
      )

    return {
      register,
      list,
      findByName,
      call
    } as const
  })
}) {}
