import { Effect, Match, Option, Predicate, Schema } from "effect"
import { CapabilityProvider } from "./CapabilityProvider.js"
import type { JsonRpcRequest, JsonRpcResponse } from "./Domain/JsonRpc.js"
import { JsonRpcError, JsonRpcSuccess, ServerResult } from "./Domain/JsonRpc.js"
import type { SessionId } from "./Domain/Session.js"
import * as Model from "./Generated.js"
import { ResourceProvider } from "./ResourceProvider.js"
import { SessionManager } from "./SessionManager.js"
import { ToolRegistry } from "./ToolRegistry.js"

export class Transport extends Effect.Service<Transport>()("Transport", {
  dependencies: [
    ToolRegistry.Default,
    CapabilityProvider.Default,
    SessionManager.Default,
    ResourceProvider.Default
  ],
  scoped: Effect.gen(function*() {
    const tools = yield* ToolRegistry
    const capabilities = yield* CapabilityProvider
    const sessions = yield* SessionManager
    const resources = yield* ResourceProvider

    const handleInitialize = Effect.all({
      _meta: Effect.succeedNone,
      capabilities: capabilities.getCapabilities,
      serverInfo: capabilities.getImplementation,
      protocolVersion: capabilities.getProtocolVersion,
      instructions: Effect.succeedNone
    }).pipe(
      Effect.map((_) => Model.InitializeResult.make(_))
    )

    const handleToolsList = Effect.all({
      _meta: Effect.succeedNone,
      tools: tools.list,
      nextCursor: Effect.succeedNone
    }).pipe(
      Effect.map((_) => Model.ListToolsResult.make(_))
    )

    const handleToolsCall = (params: Record<string, unknown>) =>
      tools.call(params as any).pipe(
        Effect.catchAll((error) =>
          Effect.succeed({
            content: [{
              type: "text" as const,
              text: error.message,
              annotations: null
            }],
            isError: true
          })
        )
      )

    const handleResourcesList = Effect.all({
      _meta: Effect.succeedNone,
      resources: resources.list,
      nextCursor: Effect.succeedNone
    }).pipe(
      Effect.map((_) => Model.ListResourcesResult.make(_))
    )

    const handleResourcesRead = (params: { uri: string }) =>
      resources.read(params.uri).pipe(
        Effect.map((contents) =>
          Model.ReadResourceResult.make({
            _meta: Option.none(),
            contents
          })
        )
      )

    const encode = Schema.encodeUnknown(ServerResult)

    const handle = (sessionId: SessionId, request: JsonRpcRequest): Effect.Effect<JsonRpcResponse | undefined> =>
      Effect.gen(function*() {
        const result = yield* Match.value(request.method).pipe(
          Match.when("initialize", () => handleInitialize),
          Match.when("ping", () => Effect.succeed(undefined)),
          Match.when("notifications/initialized", () =>
            sessions.activateById(sessionId).pipe(
              Effect.andThen(() => Effect.succeedNone)
            )),
          Match.when("notifications/cancelled", () =>
            sessions.deactivateById(sessionId).pipe(
              Effect.andThen(() => Effect.succeedNone)
            )),
          Match.when("tools/list", () => handleToolsList),
          Match.when("tools/call", () =>
            handleToolsCall(
              Option.getOrElse(request.params, () => ({}))
            )),
          Match.when("resources/list", () => handleResourcesList),
          Match.when("resources/templates/list", () =>
            Effect.succeed(
              Model.ListResourceTemplatesResult.make({
                _meta: Option.none(),
                nextCursor: Option.none(),
                resourceTemplates: []
              })
            )),
          Match.when("resources/read", () =>
            request.params.pipe(
              Option.getOrElse(() => ({})),
              Schema.decodeUnknown(Model.ReadResourceRequest.fields.params),
              Effect.andThen((params) => handleResourcesRead(params))
            )),
          Match.orElse(() =>
            Effect.fail({
              code: -32601,
              message: `Method ${request.method} not found`,
              data: Option.none()
            })
          )
        )

        /**
         * Option.none means return nothing
         */
        if (Option.isOption(result) && Option.isNone(result)) {
          return
        }

        /**
         * Undefined means return an empty object
         */
        if (Predicate.isUndefined(result)) {
          return JsonRpcSuccess.make({
            jsonrpc: "2.0",
            id: request.id,
            result: {}
          })
        }

        /**
         * Otherwise, encode the result for transport
         */
        return JsonRpcSuccess.make({
          jsonrpc: "2.0",
          id: request.id,
          result: yield* encode(result)
        })
      }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            JsonRpcError.make({
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32000,
                message: error.message ?? "Internal error",
                data: Option.none()
              }
            })
          )
        ),
        Effect.withSpan("Transport.handle", {
          attributes: {
            "mcp.method": request.method,
            "mcp.id": Option.getOrUndefined(request.id),
            "mcp.params": Option.getOrUndefined(request.params),
            "mcp.session_id": sessionId
          }
        })
      )

    return { handle }
  })
}) {}
