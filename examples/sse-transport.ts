import { HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"
import { SseTransport } from "@jpowersdev/effect-mcp"
import { ServerLive } from "./common.js"

// Create the SSE transport app
const app = Layer.unwrapEffect(SseTransport.SseTransport.pipe(
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

// Specify the port
const port = 3100

// Create a HTTP server layer with the specified port
const HttpServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(
  Layer.launch(Layer.provide(app, HttpServerLive)).pipe(
    Effect.provide(Layer.provide(SseTransport.layer, ServerLive))
  )
)
