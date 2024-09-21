import { HttpApiBuilder } from "@effect/platform"
import { Effect, Layer, pipe } from "effect"
import { Api } from "../Api.js"
import { BadRequest } from "../Api/Errors.js"
import { UserNotFound } from "../Domain/User.js"
import { Users } from "../Users.js"

export const HttpUsersLive = HttpApiBuilder.group(
  Api,
  "users",
  (handlers) =>
    Effect.gen(function*() {
      const users = yield* Users

      return handlers.pipe(
        HttpApiBuilder.handle(
          "findById",
          ({ path: { id } }) =>
            pipe(
              users.findById(id),
              Effect.flatten,
              Effect.mapError(() => new UserNotFound({ id }))
            )
        ),
        HttpApiBuilder.handle(
          "create",
          ({ payload }) =>
            pipe(
              users.create(payload),
              Effect.mapError((cause) => new BadRequest({ cause }))
            )
        ),
        HttpApiBuilder.handle(
          "update",
          ({ path: { id }, payload }) =>
            pipe(
              users.update(id, payload),
              Effect.mapError(() => new UserNotFound({ id }))
            )
        ),
        HttpApiBuilder.handle(
          "delete",
          ({ path: { id } }) => users.delete(id)
        )
      )
    })
).pipe(
  Layer.provide(Users.Live)
)
