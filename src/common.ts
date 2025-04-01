import { AiToolkit } from "@effect/ai"
import { Effect, Layer, Schema } from "effect"
import { McpServer } from "./McpServer.js"
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

export const Env = Layer.mergeAll(
  TracingLive,
  Layer.provide(
    McpServer.layer({
      name: "Echo",
      version: "1.0.0",
      protocolVersion: "2024-11-05"
    }),
    [
      ToolkitLive
    ]
  )
)
