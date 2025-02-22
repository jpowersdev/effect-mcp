import { HttpApiBuilder, HttpApiSwagger, HttpServer } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"
import { Api } from "./Api.js"

// Implement the "Greetings" group
const GreetingsLive = HttpApiBuilder.group(
  Api,
  "Greetings",
  (handlers) =>
    handlers
      .handle("hello-world", () => Effect.succeed("Hello, World!"))
)

// Provide the implementation for the API
const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(GreetingsLive)
)

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

// Set up the server using NodeHttpServer on port 3000
export const HttpLive = HttpApiBuilder.serve().pipe(
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
