import { AiToolkit } from "@effect/ai"
import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { StdioTransport } from "./StdioTransport.js"
import { TracingLive } from "./Tracing.js"

class Echo extends Schema.TaggedRequest<Echo>()("Echo", {
  success: Schema.String,
  failure: Schema.String,
  payload: {
    message: Schema.String
  }
}, {
  description: "Echo a message"
}) {}

const Toolkit = AiToolkit.empty.add(Echo)

const ToolkitLive = Toolkit.implement((handlers) =>
  Effect.gen(function*() {
    return handlers.handle("Echo", (payload) => Effect.succeed(payload.message))
  })
)

const Env = Layer.mergeAll(
  TracingLive,
  StdioTransport.WithLogger.pipe(
    Layer.provide([
      ToolkitLive
    ])
  )
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
