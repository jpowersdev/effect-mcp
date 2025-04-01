import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { Env } from "./common.js"
import { StdioTransport } from "./StdioTransport.js"

StdioTransport.run.pipe(
  Effect.provide(StdioTransport.WithLogger.pipe(
    Layer.provide(Env)
  )),
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
