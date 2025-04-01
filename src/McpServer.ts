import { Config, ConfigProvider, Effect, Layer, Option } from "effect"
import { Implementation, InitializeResult, ServerCapabilities } from "./Generated.js"
import { Tools } from "./Tools.js"

export const ServerConfig = Config.all({
  name: Config.string("MCP_SERVER_NAME"),
  version: Config.string("MCP_SERVER_VERSION"),
  protocolVersion: Config.string("MCP_PROTOCOL_VERSION").pipe(
    Config.withDefault("2024-11-05")
  )
})

export class McpServer extends Effect.Service<McpServer>()("McpServer", {
  dependencies: [Tools.Default],
  scoped: Effect.gen(function*() {
    const tools = yield* Tools

    const { protocolVersion, ...config } = yield* ServerConfig

    // Server implementation details
    const serverInfo = Implementation.make({
      name: config.name,
      version: config.version
    })

    const capabilities = ServerCapabilities.make({
      tools: tools.enabled
        ? Option.some({
          listChanged: Option.none()
        })
        : Option.none(),
      prompts: Option.some({
        listChanged: Option.none()
      }),
      resources: Option.some({
        listChanged: Option.none(),
        subscribe: Option.none(),
        templates: Option.some(true)
      }),
      logging: Option.some({
        level: "info" as const
      }),
      experimental: Option.none()
    })

    yield* Effect.logDebug("Launching MCP server").pipe(
      Effect.annotateLogs(serverAnnotations({
        serverInfo,
        capabilities,
        protocolVersion
      }))
    )

    return {
      serverInfo,
      capabilities,
      protocolVersion,
      initialize: Effect.sync(() =>
        InitializeResult.make({
          capabilities,
          serverInfo,
          protocolVersion,
          instructions: Option.none(),
          _meta: Option.none()
        })
      )
    } as const
  })
}) {
  static layer = (params: {
    name: string
    version: string
    protocolVersion?: string
  }) =>
    McpServer.Default.pipe(
      Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson({
        MCP_SERVER_NAME: params.name,
        MCP_SERVER_VERSION: params.version,
        MCP_PROTOCOL_VERSION: params.protocolVersion
      })))
    )
}

export const serverAnnotations = (server: {
  serverInfo: Implementation
  capabilities: ServerCapabilities
  protocolVersion: string
}) => {
  const annotations: Record<string, unknown> = {
    "mcp.server.name": server.serverInfo.name,
    "mcp.server.version": server.serverInfo.version,
    "mcp.protocol.version": server.protocolVersion
  }

  if (server.capabilities.tools._tag === "Some") {
    annotations["mcp.capabilities.tools"] = server.capabilities.tools
  }

  if (server.capabilities.prompts._tag === "Some") {
    annotations["mcp.capabilities.prompts"] = server.capabilities.prompts
  }

  if (server.capabilities.resources._tag === "Some") {
    annotations["mcp.capabilities.resources"] = server.capabilities.resources
  }

  if (server.capabilities.logging._tag === "Some") {
    annotations["mcp.capabilities.logging"] = server.capabilities.logging
  }

  if (server.capabilities.experimental._tag === "Some") {
    annotations["mcp.capabilities.experimental"] = server.capabilities.experimental
  }

  return annotations
}
