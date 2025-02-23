import { Cause, Effect, Match, Option, Schema } from "effect"
import { Capabilities } from "./Capabilities.js"
import type { JsonRpcRequest, JsonRpcResponse } from "./Domain/JsonRpc.js"
import { JsonRpcFailure, JsonRpcSuccess } from "./Domain/JsonRpc.js"
import {
  CallToolRequest,
  CallToolResult,
  InitializeRequest,
  InitializeResult,
  ListPromptsRequest,
  ListPromptsResult,
  ListToolsRequest,
  ListToolsResult
} from "./Generated.js"
import { Implementation } from "./Implementation.js"
import { Tools } from "./Tools.js"

class Initialize extends Schema.TaggedRequest<InitializeRequest>()("initialize", {
  payload: { ...InitializeRequest.fields },
  success: InitializeResult,
  failure: JsonRpcFailure
}) {}

class NotifyInitialized extends Schema.TaggedRequest<NotifyInitialized>()("notifications/initialized", {
  payload: {
    sessionId: Schema.String
  },
  success: Schema.Void,
  failure: JsonRpcFailure
}) {}

class ListTools extends Schema.TaggedRequest<ListToolsRequest>()("tools/list", {
  payload: { ...ListToolsRequest.fields },
  success: ListToolsResult,
  failure: JsonRpcFailure
}) {}

class CallTool extends Schema.TaggedRequest<CallToolRequest>()("tools/call", {
  payload: { ...CallToolRequest.fields },
  success: CallToolResult,
  failure: JsonRpcFailure
}) {}

class ListPrompts extends Schema.TaggedRequest<ListPromptsRequest>()("prompts/list", {
  payload: { ...ListPromptsRequest.fields },
  success: ListPromptsResult,
  failure: JsonRpcFailure
}) {}

const TransportRequest = Schema.Union(Initialize, ListPrompts, ListTools, CallTool, NotifyInitialized)
type TransportRequest = Schema.Schema.Type<typeof TransportRequest>

const TransportResponse = Schema.Union(Initialize.success, ListPrompts.success, ListTools.success, CallTool.success)

declare namespace TransportRequest {
  type Any = Schema.TaggedRequest.Any

  type All =
    | Initialize
    | ListPrompts
    | ListTools
    | CallTool

  type Method<S> = S extends All ? S["method"] : never

  type Payload<S> = S extends All ? S["params"] : never

  type Result<S extends All> = S extends Schema.TaggedRequest<
    infer _Tag,
    infer _Payload,
    infer _Implementation,
    infer _Result,
    infer _Success,
    infer _SuccessEncoded,
    infer _Failure,
    infer _FailureEncoded,
    infer _ResultContext
  > ? _Result :
    never

  type Request<S> = S extends All ? {
      jsonrpc: "2.0"
      id: Option.Option<number | string>
      method: S["method"]
      params: S["params"]
    } :
    never

  type Success<S extends All> = {
    jsonrpc: "2.0"
    id: Option.Option<number | string>
    result: Result<S>
  }

  type Failure = {
    jsonrpc: "2.0"
    id: Option.Option<number | string>
    error: any
  }

  type Response<S extends All> =
    | Success<S>
    | Failure
}

export class Transport extends Effect.Service<Transport>()("Transport", {
  dependencies: [Tools.Default, Capabilities.Default, Implementation.Default],
  scoped: Effect.gen(function*() {
    const tools = yield* Tools
    const capabilities = yield* Capabilities
    const implementation = yield* Implementation

    const initialize = Effect.all({
      _meta: Effect.succeedNone,
      capabilities: capabilities.list,
      instructions: Effect.succeedNone,
      protocolVersion: implementation.protocolVersion,
      serverInfo: implementation.serverInfo
    }).pipe(
      Effect.withSpan("Transport.initialize")
    )

    const handle = (request: JsonRpcRequest): Effect.Effect<JsonRpcResponse> =>
      Effect.gen(function*() {
        const payload = yield* Schema.decodeUnknown(TransportRequest)({
          ...request,
          _tag: request.method
        }).pipe(
          Effect.mapError((cause) => new Cause.IllegalArgumentException(`Unknown request: ${cause}`))
        )

        const result = yield* Match.value(payload).pipe(
          Match.discriminatorsExhaustive("method")({
            "initialize": () => initialize,
            "tools/list": () => tools.list,
            "tools/call": ({ params }) => tools.call(params),
            "prompts/list": () =>
              Effect.sync(() =>
                ListPromptsResult.make({
                  _meta: Option.none(),
                  nextCursor: Option.none(),
                  prompts: []
                })
              )
          })
        )

        const encoded = yield* Schema.encode(TransportResponse)(result)

        return JsonRpcSuccess.make({
          id: request.id,
          jsonrpc: "2.0",
          result: encoded
        })
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.succeed(
            JsonRpcFailure.make({
              id: request.id,
              jsonrpc: "2.0",
              error: cause
            })
          )
        ),
        Effect.withSpan("Transport.handle")
      )

    return {
      handle,
      initialize
    } as const
  })
}) {}
