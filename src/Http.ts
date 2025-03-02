import {
  Headers,
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Config, Effect, Layer, Stream } from "effect"
import { createServer } from "http"
import { Api } from "./Api.js"
import { McpProtocolAdapter } from "./McpProtocolAdapter.js"
import { messageAnnotations, MessageBroker } from "./MessageBroker.js"
import { CurrentSession, SessionManager } from "./SessionManager.js"

export const HttpMcpLive = HttpApiBuilder.group(
  Api,
  "mcp",
  (handlers) =>
    Effect.gen(function*() {
      const broker = yield* MessageBroker
      const sessions = yield* SessionManager

      return handlers
        .handleRaw("index", () =>
          HttpServerResponse.file("public/index.html").pipe(
            Effect.orDie
          ))
        .handle("send-message", ({ payload, urlParams }) =>
          Effect.gen(function*() {
            // Log the incoming request
            yield* Effect.log("Received message", {
              sessionId: urlParams.sessionId,
              method: payload.method
            })

            // Send the message to the broker for processing
            return yield* broker.offer({
              payload,
              sessionId: urlParams.sessionId
            })
          }).pipe(
            Effect.annotateLogs(messageAnnotations({ payload, sessionId: urlParams.sessionId })),
            Effect.annotateSpans({ "session.id": urlParams.sessionId }),
            Effect.provideServiceEffect(
              CurrentSession,
              sessions.findById(urlParams.sessionId)
            )
          ))
        .handleRaw("message-stream", () =>
          Effect.gen(function*() {
            // Initialize a new session
            const session = yield* sessions.initialize

            // Get message stream for session
            const messageStream = yield* broker.messages(session.id)

            return HttpServerResponse.stream(Stream.encodeText(messageStream), {
              headers: Headers.fromInput({
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive"
              })
            })
          }))
    })
).pipe(
  Layer.provide([
    MessageBroker.Default,
    SessionManager.Default,
    McpProtocolAdapter.Default
  ])
)

// Provide the implementation for the API
const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HttpMcpLive)
)

const ServerLive = Layer.unwrapEffect(
  Effect.gen(function*() {
    const port = yield* Config.number("PORT")

    return NodeHttpServer.layer(createServer, { port })
  })
)

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
