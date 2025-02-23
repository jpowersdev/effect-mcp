import { Effect, Match, Option, Schema } from "effect"
import type { JsonRpcRequest } from "./Domain/JsonRpc.js"
import { JsonRpcFailure, JsonRpcSuccess } from "./Domain/JsonRpc.js"
import {
  Implementation,
  InitializeRequest,
  InitializeResult,
  ListPromptsRequest,
  ListPromptsResult,
  ServerCapabilities
} from "./Generated.js"

type Methods = {
  initialize: [InitializeRequest, InitializeResult]
  "prompts/list": [ListPromptsRequest, ListPromptsResult]
}

class Initialize extends Schema.TaggedRequest<InitializeRequest>()("initialize", {
  payload: { ...InitializeRequest.fields },
  success: InitializeResult,
  failure: JsonRpcFailure
}) {}

class ListPrompts extends Schema.TaggedRequest<ListPromptsRequest>()("prompts/list", {
  payload: { ...ListPromptsRequest.fields },
  success: ListPromptsResult,
  failure: JsonRpcFailure
}) {}

const TransportRequest = Schema.Union(Initialize, ListPrompts)
export type TransportRequest = Schema.Schema.Type<typeof TransportRequest>

const TransportResponse = Schema.Union(Initialize.success, ListPrompts.success)
export type TransportResponse = Schema.Schema.Type<typeof TransportResponse>

export class Transport extends Effect.Service<Transport>()("Transport", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const initialize = Effect.succeed(Initialize.success.make({
      _meta: Option.none(),
      capabilities: ServerCapabilities.make({
        prompts: Option.none(),
        tools: Option.none(),
        resources: Option.none(),
        logging: Option.none(),
        experimental: Option.none()
      }),
      instructions: Option.none(),
      protocolVersion: "2024-11-05",
      serverInfo: Implementation.make({
        name: "ModelContextProtocolTransport",
        version: "1.0.0"
      })
    }))

    const handle = <
      Method extends keyof Methods,
      Request extends Methods[Method][0],
      Result extends Methods[Method][1]
    >(
      request: JsonRpcRequest & { params: Request }
    ): Effect.Effect<JsonRpcSuccess | JsonRpcFailure, never> =>
      Effect.gen(function*() {
        const result = yield* Match.value(request).pipe(
          Match.discriminators("method")({
            "initialize": () => initialize,
            "prompts/list": () =>
              Effect.sync(() =>
                ListPromptsResult.make({
                  _meta: Option.none(),
                  nextCursor: Option.none(),
                  prompts: []
                })
              )
          }),
          Match.orElse(() => Effect.die(new Error("Unknown method")))
        )

        const encoded = yield* Schema.encode(TransportResponse)(result)

        return JsonRpcSuccess.make({
          id: request.id,
          jsonrpc: "2.0",
          result: encoded
        }) as JsonRpcSuccess & { result: Result }
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.succeed(
            JsonRpcFailure.make({
              id: request.id,
              jsonrpc: "2.0",
              error: cause
            })
          )
        )
      )

    return {
      handle,
      initialize
    } as const
  })
}) {}
