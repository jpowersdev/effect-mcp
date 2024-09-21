import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Config, Layer, pipe } from "effect"
import { createServer } from "http"
import { Api } from "./Api.js"
import { HttpUsersLive } from "./Users/Http.js"

const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HttpUsersLive)
)

const ServerLive = pipe(
  Config.number("PORT"),
  Config.map((port) => NodeHttpServer.layer(createServer, { port })),
  Layer.unwrapEffect
)

// use the `HttpApiBuilder.serve` function to register our API with the HTTP
// server
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
