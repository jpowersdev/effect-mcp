import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSecurity,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { DateTime, Effect, Layer } from "effect"
import { createServer } from "node:http"

// --------------------------------------------
// Implementation
// --------------------------------------------

// Our domain "User" Schema
class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
}) {}

// define the error schemas
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {}
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      HttpApiEndpoint.setPath(
        Schema.Struct({
          id: Schema.NumberFromString
        })
      ),
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.addError(UserNotFound, { status: 404 })
    )
  ),
  // HttpApiGroup.add(
  //   HttpApiEndpoint.post("create", "/users").pipe(
  //     HttpApiEndpoint.setSuccess(User),
  //     // and here is a Schema for the request payload / body
  //     //
  //     // this is a POST request, so the payload is in the body
  //     // but for a GET request, the payload would be in the URL search params
  //     HttpApiEndpoint.setPayload(
  //       Schema.Struct({
  //         name: Schema.String
  //       })
  //     )
  //   )
  // ),
  // // by default, the endpoint will respond with a 204 No Content
  // HttpApiGroup.add(HttpApiEndpoint.del("delete", "/users/:id")),
  // HttpApiGroup.add(
  //   HttpApiEndpoint.patch("update", "/users/:id").pipe(
  //     HttpApiEndpoint.setSuccess(User),
  //     HttpApiEndpoint.setPayload(
  //       Schema.Struct({
  //         name: Schema.String
  //       })
  //     )
  //   )
  // ),
  // HttpApiGroup.add(
  //   HttpApiEndpoint.post("upload", "/users/upload").pipe(
  //     HttpApiEndpoint.setPayload(
  //       HttpApiSchema.Multipart(
  //         Schema.Struct({
  //           // add a "files" field to the schema
  //           files: Multipart.FilesSchema
  //         })
  //       )
  //     )
  //   )
  // ),
  // HttpApiGroup.add(
  //   HttpApiEndpoint.get("csv", "/users/csv").pipe(
  //     HttpApiEndpoint.setSuccess(
  //       Schema.String.pipe(
  //         HttpApiSchema.withEncoding({
  //           kind: "Text",
  //           contentType: "text/csv"
  //         })
  //       )
  //     )
  //   )
  // ),
  // // or we could add an error to the group
  HttpApiGroup.addError(Unauthorized, { status: 401 }),
  // add an OpenApi title & description
  OpenApi.annotate({
    title: "Users API",
    description: "API for managing users"
  })
) {}

const security = HttpApiSecurity.bearer

class MyApi extends HttpApi.empty.pipe(
  HttpApi.addGroup(UsersApi.pipe(
    HttpApiGroup.annotateEndpoints(OpenApi.Security, security)
  ))
) {}

// the `HttpApiBuilder.group` api returns a `Layer`
const UsersApiLive: Layer.Layer<HttpApiGroup.HttpApiGroup.Service<"users">> = HttpApiBuilder.group(
  MyApi,
  "users",
  (handlers) =>
    handlers.pipe(
      // the parameters & payload are passed to the handler function.
      HttpApiBuilder.handle("findById", ({ path: { id } }) =>
        Effect.succeed(
          new User({
            id,
            name: "John Doe",
            createdAt: DateTime.unsafeNow()
          })
        ))
    )
)

const MyApiLive: Layer.Layer<HttpApi.HttpApi.Service> = HttpApiBuilder.api(
  MyApi
).pipe(Layer.provide(UsersApiLive))

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
  Layer.provide(MyApiLive),
  // Log the address the server is listening on
  HttpServer.withLogAddress,
  // Provide the HTTP server implementation
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)
