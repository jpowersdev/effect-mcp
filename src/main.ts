import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Logger, LogLevel } from "effect"
import { HttpLive } from "./Http.js"
import { TracingLive } from "./Tracing.js"

const Env = Layer.mergeAll(
  TracingLive,
  Logger.minimumLogLevel(LogLevel.Debug)
)

HttpLive.pipe(
  Layer.provide(Env),
  Layer.launch,
  Effect.tapErrorCause((_) => Effect.logError(_)),
  NodeRuntime.runMain
)

process.on("SIGINT", () => {
  console.log("SIGINT")
  process.exit(0)
})
