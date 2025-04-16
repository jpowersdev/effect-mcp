import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { StdioTransport } from "@jpowersdev/effect-mcp"
import { ServerLive } from "./common.js"

// Run the stdio transport
StdioTransport.launch.pipe(
  Effect.provide(StdioTransport.layerWithLogger.pipe(
    Layer.provide(ServerLive)
  )),
  Effect.scoped,
  NodeRuntime.runMain({
    disableErrorReporting: true,
    disablePrettyLogger: true
  })
)
