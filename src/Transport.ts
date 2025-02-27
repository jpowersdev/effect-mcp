import { Effect, Match, Option, Predicate, Schema } from "effect"
import { CapabilityProvider } from "./CapabilityProvider.js"
import { ClientRequest, JsonRpcError, JsonRpcRequest, JsonRpcSuccess, ServerResult } from "./Domain/JsonRpc.js"
import type { SessionId } from "./Domain/Session.js"
import * as Model from "./Generated.js"
import { messageAnnotations } from "./MessageBroker.js"
import { PromptProvider } from "./PromptProvider.js"
import { ResourceProvider } from "./ResourceProvider.js"
import { SessionManager } from "./SessionManager.js"
import { ToolRegistry } from "./ToolRegistry.js"

export class Transport extends Effect.Service<Transport>()("Transport", {
  dependencies: [
    ToolRegistry.Default,
    CapabilityProvider.Default,
    SessionManager.Default,
    ResourceProvider.Default,
    PromptProvider.Default
  ],
  scoped: Effect.gen(function*() {
    const tools = yield* ToolRegistry
    const capabilities = yield* CapabilityProvider
    const sessions = yield* SessionManager
    const resources = yield* ResourceProvider
    const prompts = yield* PromptProvider

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

    const handleResourcesTemplatesList = Effect.all({
      _meta: Effect.succeedNone,
      resourceTemplates: resources.listTemplates,
      nextCursor: Effect.succeedNone
    }).pipe(
      Effect.map((_) => Model.ListResourceTemplatesResult.make(_))
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

    const handlePromptsList = Effect.all({
      _meta: Effect.succeedNone,
      prompts: prompts.list,
      nextCursor: Effect.succeedNone
    }).pipe(
      Effect.map((_) => Model.ListPromptsResult.make(_))
    )

    const handlePromptsGet = (request: Model.GetPromptRequest) =>
      prompts.get(request).pipe(
        Effect.map(({ messages }) =>
          Model.GetPromptResult.make({
            _meta: Option.none(),
            description: Option.none(),
            messages
          })
        )
      )

    const encode = Schema.encodeUnknown(ServerResult, { onExcessProperty: "preserve" })

    const handle = (
      sessionId: SessionId,
      request: JsonRpcRequest
    ) =>
      Effect.gen(function*() {
        const decoded = yield* Schema.encode(JsonRpcRequest)(request).pipe(
          Effect.andThen((result) => Schema.decodeUnknown(ClientRequest)(result))
        )
        const result = yield* Match.value(decoded).pipe(
          Match.discriminators("method")({
            initialize: () => handleInitialize,
            ping: () => Effect.succeed(undefined),
            "notifications/initialized": () =>
              sessions.activateById(sessionId).pipe(
                Effect.andThen(() => Effect.succeedNone)
              ),
            "notifications/cancelled": () =>
              sessions.deactivateById(sessionId).pipe(
                Effect.andThen(() => Effect.succeedNone)
              ),
            "tools/list": () => handleToolsList,
            "tools/call": (request) => handleToolsCall(request.params),
            "resources/list": () => handleResourcesList,
            "resources/templates/list": () => handleResourcesTemplatesList,
            "resources/read": (request) => handleResourcesRead(request.params),
            "prompts/list": () => handlePromptsList,
            "prompts/get": (request) => handlePromptsGet(request)
          }),
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
            id: Option.fromNullable(request.id),
            result: {}
          })
        }

        /**
         * Otherwise, encode the result for transport
         */
        return JsonRpcSuccess.make({
          jsonrpc: "2.0",
          id: Option.fromNullable(request.id),
          result: yield* encode(result)
        })
      }).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.catchAll((error) =>
          Effect.succeed(
            JsonRpcError.make({
              jsonrpc: "2.0",
              id: Option.fromNullable(request.id),
              error: {
                code: -32000,
                message: error.message ?? "Internal error",
                data: Option.none()
              }
            })
          )
        ),
        Effect.withSpan("Transport.handle", {
          attributes: messageAnnotations({ payload: request, sessionId })
        })
      )

    return { handle }
  })
}) {}
