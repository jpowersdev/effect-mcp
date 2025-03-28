import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Logger, LogLevel } from "effect"
import { StdioTransport } from "./StdioTransport.js"
import { TracingLive } from "./Tracing.js"

const Env = Layer.mergeAll(
  TracingLive,
  StdioTransport.WithLogger
)

StdioTransport.run.pipe(
  Effect.provide(Env),
  Effect.scoped,
  NodeRuntime.runMain({
    disableErrorReporting: true,
    disablePrettyLogger: true
  })
)

process.on("SIGINT", () => {
  console.log("SIGINT")
  process.exit(0)
})
