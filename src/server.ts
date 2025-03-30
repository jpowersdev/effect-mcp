import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"

import { AiToolkit } from "@effect/ai"
import { HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "http"
import { SseTransport } from "./SseTransport.js"
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
  handlers.handle("Echo", (payload) => Effect.succeed(payload.message))
)

const app = Layer.unwrapEffect(SseTransport.pipe(
  Effect.map((router) =>
    // Set up the application server with logging
    router.pipe(
      HttpRouter.use(HttpMiddleware.logger),
      HttpRouter.use(HttpMiddleware.cors({
        allowedOrigins: ["*"],
        allowedMethods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Content-Type", "Authorization"],
        maxAge: 3600
      })),
      HttpServer.serve(),
      HttpServer.withLogAddress
    )
  )
))

const Env = Layer.mergeAll(
  TracingLive,
  SseTransport.Default.pipe(
    Layer.provide([
      ToolkitLive
    ])
  )
)

// Specify the port
const port = 3100

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(
  Layer.launch(Layer.provide(app, ServerLive)).pipe(
    Effect.provide(Env)
  )
)
