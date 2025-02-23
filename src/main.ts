import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpLive } from "./Http.js"
import { TracingLive } from "./Tracing.js"

HttpLive.pipe(
  Layer.provide(TracingLive),
  Layer.launch,
  Effect.tapErrorCause((_) => Effect.logError(_)),
  NodeRuntime.runMain
)

process.on("SIGINT", () => {
  console.log("SIGINT")
  process.exit(0)
})
