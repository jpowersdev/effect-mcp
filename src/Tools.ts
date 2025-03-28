import { AiToolkit } from "@effect/ai"
import { Array, Cause, Effect, Either, JSONSchema, Match, Option, pipe, Predicate, SchemaAST, Struct } from "effect"
import type { CallToolRequest } from "./Generated.js"
import { CallToolResult, TextContent, Tool } from "./Generated.js"

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

    const list: Effect.Effect<Array<Tool>, Cause.NoSuchElementException> = Option.match(toolkit, {
      onNone: () => Effect.fail(new Cause.NoSuchElementException("No toolkit found")),
      onSome: (toolkit) =>
        Effect.forEach(
          toolkit.keys(),
          (schema) => Effect.sync(() => convertTool(schema))
        )
    }).pipe(
      Effect.withSpan("Tools.list")
    )

    const call: {
      (
        request: CallToolRequest
      ): Effect.Effect<CallToolResult, never, never>
    } = Effect.fn("Tools.call", {
      root: true
    })(
      function*(request: CallToolRequest) {
        yield* Effect.annotateCurrentSpan({
          tool: request.params.name,
          arguments: request.params.arguments
        })

        return yield* Option.match(toolkit, {
          onNone: () =>
            Effect.succeed(CallToolResult.make({
              content: [
                TextContent.make({
                  type: "text",
                  text: new Cause.IllegalArgumentException("No toolkit found").message,
                  annotations: Option.none()
                })
              ],
              isError: Option.some(true),
              _meta: Option.some({})
            })),
          onSome: (toolkit) =>
            Effect.either(Effect.gen(function*() {
              yield* Effect.annotateCurrentSpan({
                tool: request.params.name,
                arguments: request.params.arguments
              })

              const tool = pipe(
                Array.fromIterable(toolkit.keys()),
                Array.findFirst((schema) => schema._tag === request.params.name)
              )

              if (tool._tag === "None") {
                return yield* new Cause.NoSuchElementException(`Tool ${request.params.name} not found`)
              }

              const handler = Option.fromNullable(toolkit.get(tool.value))

              if (handler._tag === "None") {
                return yield* Effect.fail(new Error(`Tool ${request.params.name} handler not found`))
              }

              const result = yield* handler.value(injectTag(
                request.params.arguments,
                tool.value._tag
              )) as Effect.Effect<unknown, never, never>

              yield* Effect.annotateCurrentSpan({
                result
              })

              yield* Effect.logDebug("Result").pipe(
                Effect.annotateLogs({ result }),
                Effect.withSpan("Tools.call.result")
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
            })).pipe(
              Effect.map(Either.match({
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
              }))
            )
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
