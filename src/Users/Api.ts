import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "@effect/schema"
import { security } from "../Api/Security.js"
import { User, UserIdFromString, UserNotFound } from "../Domain/User.js"

const path = Schema.Struct({
  id: UserIdFromString
})

export class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      HttpApiEndpoint.setPath(path),
      HttpApiEndpoint.setSuccess(User.json),
      HttpApiEndpoint.addError(UserNotFound)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("create", "/users").pipe(
      HttpApiEndpoint.setSuccess(User.json),
      HttpApiEndpoint.setPayload(User.jsonCreate)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.patch("update", "/users/:id").pipe(
      HttpApiEndpoint.setPath(path),
      HttpApiEndpoint.setSuccess(User.json),
      HttpApiEndpoint.setPayload(User.jsonUpdate),
      HttpApiEndpoint.addError(UserNotFound)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.del("delete", "/users/:id").pipe(
      HttpApiEndpoint.setPath(path),
      HttpApiEndpoint.setSuccess(Schema.Void)
    )
  ),
  OpenApi.annotate({
    title: "Users API",
    description: "API for managing users",
    security
  })
) {}
