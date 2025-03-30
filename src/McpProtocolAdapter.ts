import { Effect, Either, flow, Match, Option, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"
import { CapabilityProvider } from "./CapabilityProvider.js"
import {
  CallToolRequest,
  CallToolResult,
  CancelledNotification,
  GetPromptRequest,
  GetPromptResult,
  InitializedNotification,
  InitializeRequest,
  InitializeResult,
  ListPromptsRequest,
  ListPromptsResult,
  ListResourcesRequest,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ListToolsRequest,
  ListToolsResult,
  PingRequest,
  ReadResourceRequest,
  ReadResourceResult
} from "./Generated.js"
import type { JsonRpcRequest, JsonRpcResponse } from "./JsonRpc.js"
import { JsonRpcError, JsonRpcSuccess } from "./JsonRpc.js"
import { PromptProvider } from "./PromptProvider.js"
import { ResourceProvider } from "./ResourceProvider.js"
import type { Session } from "./SessionManager.js"
import { SessionManager } from "./SessionManager.js"
import { Tools } from "./Tools.js"

const Request = Schema.Union(
  InitializeRequest,
  InitializedNotification,
  PingRequest,
  CancelledNotification,
  ListToolsRequest,
  CallToolRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ReadResourceRequest,
  ListPromptsRequest,
  GetPromptRequest
)

const Result = Schema.Union(
  InitializeResult,
  ListToolsResult,
  CallToolResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  ListPromptsResult,
  GetPromptResult
)

/**
 * McpProtocolAdapter handles the translation between MCP protocol messages and domain services.
 * It's responsible for:
 * 1. Mapping MCP methods to appropriate domain service calls
 * 2. Converting domain results to MCP response format
 * 3. Handling protocol-specific errors
 */
export class McpProtocolAdapter extends Effect.Service<McpProtocolAdapter>()("McpProtocolAdapter", {
  dependencies: [
    CapabilityProvider.Default,
    SessionManager.Default,
    ResourceProvider.Default,
    PromptProvider.Default,
    Tools.Default
  ],
  scoped: Effect.gen(function*() {
    const tools = yield* Tools
    const capabilities = yield* CapabilityProvider
    const sessions = yield* SessionManager
    const resources = yield* ResourceProvider
    const prompts = yield* PromptProvider

    const decode = Schema.decodeUnknown(Request, { onExcessProperty: "preserve" })
    const encode = Schema.encodeUnknown(Result, { onExcessProperty: "preserve" })

    /**
     * Return empty object
     */
    const emptyResponse = Effect.succeed({})

    /**
     * Do not respond
     */
    const noReply = Effect.succeedNone

    const withMeta = <A, E, R>(self: Effect.Effect<A, E, R>) =>
      self.pipe(
        Effect.map((result) => ({
          ...result,
          _meta: Option.none()
        }))
      )

    const withPagination = <A, E, R>(self: Effect.Effect<A, E, R>) =>
      self.pipe(
        Effect.map((result) => ({
          ...result,
          nextCursor: Option.none()
        }))
      )

    const handle = (session: Session) =>
      Effect.fn("McpProtocolAdapter.handle")(function*(request: typeof Request.Type) {
        yield* Effect.annotateCurrentSpan({
          request,
          session
        })

        return yield* Effect.either(
          Match.value(request).pipe(
            Match.discriminatorsExhaustive("method")({
              initialize: () =>
                capabilities.describe.pipe(
                  withMeta
                ),
              ping: () => emptyResponse,
              "notifications/initialized": () =>
                sessions.activateById(session.id).pipe(
                  Effect.andThen(() => noReply)
                ),
              "notifications/cancelled": () =>
                sessions.deactivateById(session.id).pipe(
                  Effect.andThen(() => noReply)
                ),
              "tools/list": () =>
                Effect.all({ tools: tools.list }).pipe(
                  flow(withMeta, withPagination)
                ),
              "tools/call": (request) => tools.call(request),
              "resources/list": () =>
                Effect.all({ resources: resources.list }).pipe(
                  flow(withMeta, withPagination)
                ),
              "resources/templates/list": () =>
                Effect.all({ resourceTemplates: resources.listTemplates }).pipe(
                  flow(withMeta, withPagination)
                ),
              "resources/read": ({ params }) =>
                Effect.all({ contents: resources.read(params.uri) }).pipe(
                  withMeta
                ),
              "prompts/list": () =>
                Effect.all({ prompts: prompts.list }).pipe(
                  flow(withMeta, withPagination)
                ),
              "prompts/get": (request) =>
                prompts.get(request).pipe(
                  Effect.map(({ messages, prompt }) => ({
                    description: prompt.description,
                    messages
                  })),
                  withMeta
                )
            })
          )
        )
      })

    /**
     * Process an MCP request and return an MCP response
     * Assumes the request has already been validated as a valid JsonRpcRequest
     */
    const processRequest = Effect.fn("McpProtocolAdapter.processRequest")((
      session: Session,
      request: JsonRpcRequest
    ): Effect.Effect<Option.Option<JsonRpcResponse>, JsonRpcError | ParseError> =>
      Effect.gen(function*() {
        yield* Effect.logDebug("Processing request")

        const result = yield* decode(request).pipe(
          Effect.flatMap((_) => handle(session)(_))
        )

        if (Either.isLeft(result)) {
          yield* Effect.annotateCurrentSpan({
            "mcp.error": result.left
          })

          yield* Effect.logError("Error processing request").pipe(
            Effect.annotateLogs({ cause: result.left })
          )

          return Option.some(JsonRpcError.make({
            id: Option.fromNullable(request.id),
            error: {
              code: -32000,
              message: "Internal server error",
              data: Option.none()
            }
          }))
        }

        yield* Effect.annotateCurrentSpan({
          "mcp.result": result.right
        })

        const succeed = (value: unknown) =>
          Effect.map(
            encode(value),
            (result) =>
              Option.some(JsonRpcSuccess.make({
                id: Option.fromNullable(request.id),
                result
              }))
          )

        if (Option.isOption(result.right)) {
          return yield* Option.match(result.right, {
            onSome: (value) => succeed(value),
            onNone: () => Effect.succeedNone
          })
        }

        return yield* succeed(result.right)
      }).pipe(
        Effect.tapErrorCause(Effect.logError)
      )
    )

    return {
      processRequest
    }
  })
}) {}
