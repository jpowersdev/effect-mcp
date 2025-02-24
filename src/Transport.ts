import { Effect, Match, Option } from "effect"
import { CapabilityProvider } from "./CapabilityProvider.js"
import { ToolRegistry } from "./ToolRegistry.js"

// Protocol types
export interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: Option.Option<string | number>
  method: string
  params: Option.Option<Record<string, unknown>>
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0"
  id: Option.Option<string | number>
  result: unknown
}

export interface JsonRpcError {
  jsonrpc: "2.0"
  id: Option.Option<string | number>
  error: {
    code: number
    message: string
    data: Option.Option<unknown>
  }
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError

export class Transport extends Effect.Service<Transport>()("Transport", {
  dependencies: [
    ToolRegistry.Default,
    CapabilityProvider.Default
  ],
  scoped: Effect.gen(function*() {
    const tools = yield* ToolRegistry
    const capabilities = yield* CapabilityProvider

    const handleInitialize = Effect.gen(function*() {
      const { protocolVersion, ...serverInfo } = yield* capabilities.getImplementation

      return {
        capabilities: yield* capabilities.getCapabilities,
        serverInfo,
        protocolVersion
      }
    })

    const handleToolsList = tools.list

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

    const handle = (request: JsonRpcRequest): Effect.Effect<JsonRpcResponse> =>
      Effect.gen(function*() {
        const result = yield* Match.value(request.method).pipe(
          Match.when("initialize", () => handleInitialize),
          Match.when("tools/list", () => handleToolsList),
          Match.when("tools/call", () =>
            handleToolsCall(
              Option.getOrElse(request.params, () => ({}))
            )),
          Match.orElse(() =>
            Effect.fail({
              code: -32601,
              message: `Method ${request.method} not found`,
              data: Option.none()
            })
          )
        )

        return {
          jsonrpc: "2.0",
          id: request.id,
          result
        } as const
      }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: error.code ?? -32000,
                message: error.message ?? "Internal error",
                data: Option.none()
              }
            } as const
          )
        ),
        Effect.withSpan("Transport.handle", {
          attributes: {
            "mcp.method": request.method,
            "mcp.id": Option.getOrUndefined(request.id),
            "mcp.params": Option.getOrUndefined(request.params)
          }
        })
      )

    return { handle }
  })
}) {}
