import { AiToolkit } from "@effect/ai"
import { Array, Cause, Effect, Either, JSONSchema, Match, Option, pipe, Predicate, SchemaAST, Struct } from "effect"
import type { CallToolRequest } from "./Generated.js"
import { CallToolResult, ListToolsResult, TextContent, Tool } from "./Generated.js"

const makeJsonSchema = (ast: SchemaAST.AST): JSONSchema.JsonSchema7 => {
  const $defs = {}
  const schema = JSONSchema.fromAST(ast, {
    definitions: $defs,
    topLevelReferenceStrategy: "skip"
  })
  if (Object.keys($defs).length === 0) return schema
  ;(schema as any).$defs = $defs
  return schema
}

const getDescription = (ast: SchemaAST.AST): string => {
  const annotations = ast._tag === "Transformation"
    ? {
      ...ast.to.annotations,
      ...ast.annotations
    }
    : ast.annotations
  return SchemaAST.DescriptionAnnotationId in annotations
    ? (annotations[SchemaAST.DescriptionAnnotationId] as string)
    : ""
}

const convertTool = (schema: AiToolkit.Tool.AnySchema) => {
  const ast = (schema as any).ast

  return Tool.make({
    name: schema._tag,
    inputSchema: Struct.evolve(makeJsonSchema(SchemaAST.omit(ast, ["_tag"])), {
      properties: Option.fromNullable,
      required: Option.fromNullable
    }) as any,
    description: Option.some(getDescription(ast))
  })
}

/**
 * Certain providers (i.e. Anthropic) do not do a great job returning the
 * `_tag` enum with the parameters for a tool call. This method ensures that
 * the `_tag` is injected into the tool call parameters to avoid issues when
 * decoding.
 */
function injectTag(params: unknown, tag: string) {
  // If for some reason we do not receive an object back for the tool call
  // input parameters, just return them unchanged
  if (!Predicate.isObject(params)) {
    return params
  }
  // If the tool's `_tag` is already present in input parameters, return them
  // unchanged
  if (Predicate.hasProperty(params, "_tag")) {
    return params
  }
  // Otherwise inject the tool's `_tag` into the input parameters
  return { ...params, _tag: tag }
}

export class Tools extends Effect.Service<Tools>()("Tools", {
  dependencies: [],
  effect: Effect.gen(function*() {
    const toolkit = yield* Effect.serviceOption(AiToolkit.Registry)

    const enabled = Option.isSome(toolkit)

    const list: Effect.Effect<ListToolsResult, Cause.NoSuchElementException> = Option.match(toolkit, {
      onNone: () => Effect.fail(new Cause.NoSuchElementException("No toolkit found")),
      onSome: (toolkit) =>
        Effect.forEach(toolkit.keys(), (schema) => Effect.sync(() => convertTool(schema))).pipe(
          Effect.map((tools) =>
            ListToolsResult.make({
              tools,
              _meta: Option.none(),
              nextCursor: Option.none()
            })
          )
        )
    }).pipe(
      Effect.withSpan("Tools.list")
    )

    const call: {
      (request: CallToolRequest): Effect.Effect<CallToolResult, never, never>
    } = Effect.fn("Tools.call")(
      function*(request: CallToolRequest) {
        yield* Effect.annotateCurrentSpan({
          tool: request.params.name,
          arguments: request.params.arguments
        })

        if (toolkit._tag === "None") {
          return CallToolResult.make({
            content: [
              TextContent.make({
                type: "text",
                text: new Cause.IllegalArgumentException("No toolkit found").message,
                annotations: Option.none()
              })
            ],
            isError: Option.some(true),
            _meta: Option.some({})
          })
        }

        const result = yield* Effect.either(Effect.gen(function*() {
          const tool = pipe(
            Array.fromIterable(toolkit.value.keys()),
            Array.findFirst((schema) => schema._tag === request.params.name)
          )

          if (tool._tag === "None") {
            return yield* new Cause.NoSuchElementException(`Tool ${request.params.name} not found`)
          }

          const handler = Option.fromNullable(toolkit.value.get(tool.value))

          if (handler._tag === "None") {
            return yield* new Cause.NoSuchElementException(`Tool ${request.params.name} handler not found`)
          }

          if (request.params.arguments._tag === "None") {
            return yield* new Cause.IllegalArgumentException("No arguments provided")
          }

          const result = yield* handler.value(injectTag(
            request.params.arguments.value,
            tool.value._tag
          )) as Effect.Effect<unknown, never, never>

          yield* Effect.logDebug("Result").pipe(
            Effect.annotateLogs({ result })
          )

          const text = Match.value(result).pipe(
            Match.when(Match.undefined, () => ""),
            Match.when(Match.string, (value) => value),
            Match.orElse((value) => JSON.stringify(value))
          )

          return [
            TextContent.make({
              type: "text",
              text,
              annotations: Option.none()
            })
          ]
        }))

        return Either.match(result, {
          onLeft: (error) =>
            CallToolResult.make({
              content: [TextContent.make({
                type: "text",
                text: error.message,
                annotations: Option.none()
              })],
              isError: Option.some(true),
              _meta: Option.some({})
            }),
          onRight: (content) =>
            CallToolResult.make({
              content,
              isError: Option.none(),
              _meta: Option.none()
            })
        })
      }
    )

    return {
      enabled,
      list,
      call
    }
  })
}) {}
