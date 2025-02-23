import {
  Headers,
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"
import { Api } from "./Api.js"
import { Mailbox } from "./Mailbox.js"

export const HttpMcpLive = HttpApiBuilder.group(
  Api,
  "mcp",
  (handlers) =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox

      return handlers
        .handleRaw("index", () =>
          HttpServerResponse.file("public/index.html").pipe(
            Effect.orDie
          ))
        .handle("send-message", ({ payload }) => mailbox.offer(payload))
        .handleRaw("message-stream", () =>
          HttpServerResponse.stream(mailbox.messages, {
            headers: Headers.fromInput({
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive"
            })
          }))
    })
).pipe(
  Layer.provide([
    Mailbox.Default
  ])
)

// Provide the implementation for the API
const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HttpMcpLive)
)

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

// Set up the server using NodeHttpServer on port 3000
export const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Provide the swagger documentation
  Layer.provide(
    HttpApiSwagger.layer({
      // "/docs" is the default path for the swagger documentation
      path: "/docs"
    })
  ),
  // and the OpenApi.json file
  Layer.provide(HttpApiBuilder.middlewareOpenApi()),
  // Add CORS middleware
  Layer.provide(HttpApiBuilder.middlewareCors()),
  // Provide the API implementation
  Layer.provide(ApiLive),
  // Log the address the server is listening on
  HttpServer.withLogAddress,
  // Provide the HTTP server implementation
  Layer.provide(ServerLive)
)
