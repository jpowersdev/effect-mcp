import { AiToolkit } from "@effect/ai"
import { Effect, Layer, Schema } from "effect"
import { McpServer } from "@jpowersdev/effect-mcp"

// Define a simple echo tool
export class Echo extends Schema.TaggedRequest<Echo>()("Echo", {
  success: Schema.String,
  failure: Schema.String,
  payload: {
    message: Schema.String
  }
}, {
  description: "Echo a message"
}) {}

// Create a toolkit with the Echo tool
export const Toolkit = AiToolkit.empty.add(Echo)

// Implement the toolkit
export const ToolkitLive = Toolkit.implement((handlers) =>
  Effect.gen(function*() {
    return handlers.handle("Echo", (payload) => Effect.succeed(payload.message))
  })
)

// Export the server layer with the toolkit
export const ServerLive = McpServer.layer({
  name: "Echo",
  version: "1.0.0",
  protocolVersion: "2024-11-05"
}).pipe(
  Layer.provide(ToolkitLive)
)