import { Effect, JSONSchema, Match, Option, Schema, SchemaAST } from "effect"
import type { CallToolRequest } from "./Generated.js"
import { CallToolResult, ListToolsResult, TextContent, Tool as Tool_ } from "./Generated.js"

class InvalidToolError extends Schema.TaggedError<InvalidToolError>()("InvalidToolError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

class GetNameTool extends Schema.TaggedRequest<GetNameTool>()("GetName", {
  payload: {},
  success: Schema.String,
  failure: Schema.Never
}, {
  description: "Get the current user's name"
}) {}

const Tool = Schema.Union(GetNameTool)
type Tool = Schema.Schema.AsSchema<typeof Tool>

export class Tools extends Effect.Service<Tools>()("Tools", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const summarizeTool = (tool: Tool) =>
      Effect.gen(function*() {
        const jsonSchema = JSONSchema.make(tool)
        const name = SchemaAST.getJSONIdentifier(
          Schema.typeSchema(tool).ast
        ).pipe(Option.getOrElse(() => ""))

        const inputSchema = jsonSchema.$defs?.[name]
        if (!inputSchema) {
          yield* Effect.die(`No input schema found for tool ${name}`)
        }

        const result = {
          name,
          description: SchemaAST.getDescriptionAnnotation(
            Schema.typeSchema(tool).ast
          ),
          inputSchema: {
            ...inputSchema,
            properties: Option.fromNullable((inputSchema as any).properties),
            required: Option.fromNullable((inputSchema as any).required)
          }
        }

        return Tool_.make(result as any)
      }).pipe(
        Effect.tap(Effect.log),
        Effect.tapErrorCause(Effect.logError)
      )

    const list = Effect.gen(function*() {
      const tools = yield* Effect.forEach(
        [GetNameTool],
        (_) => summarizeTool(_)
      )

      return ListToolsResult.make({
        _meta: Option.none(),
        nextCursor: Option.none(),
        tools
      })
    }).pipe(
      Effect.tap(Effect.log)
    )

    const call = ({ name, ...args }: CallToolRequest["params"]) =>
      Effect.gen(function*() {
        const payload = yield* Schema.decodeUnknown(Tool)({
          ...args,
          _tag: name
        }).pipe(
          Effect.mapError((cause) =>
            InvalidToolError.make({
              cause,
              message: "Invalid tools/call request"
            })
          )
        )

        const result = Match.value(payload).pipe(
          Match.tagsExhaustive({
            GetName: () => Effect.succeed("Jonathan")
          })
        )

        return CallToolResult.make({
          _meta: Option.none(),
          content: [
            TextContent.make({
              text: yield* result,
              type: "text",
              annotations: Option.none()
            })
          ],
          isError: Option.none()
        })
      })

    return {
      list,
      call
    } as const
  })
}) {}
