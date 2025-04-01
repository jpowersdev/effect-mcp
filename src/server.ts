import { HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"
import { Env } from "./common.js"
import { SseTransport } from "./SseTransport.js"

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
// Specify the port
const port = 3100

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(
  Layer.launch(Layer.provide(app, ServerLive)).pipe(
    Effect.provide(Layer.provide(SseTransport.Default, Env))
  )
)
