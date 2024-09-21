import { Model, SqlClient } from "@effect/sql"
import { DateTime, Effect, Layer, Option, pipe } from "effect"
import type { User, UserId } from "./Domain/User.js"
import { UserNotFound } from "./Domain/User.js"
import { SqlLive, SqlTest } from "./Sql.js"
import { UserRepo } from "./Users/Repo.js"

const make = Effect.gen(function*() {
  const repo = yield* UserRepo
  const sql = yield* SqlClient.SqlClient

  const create = (user: typeof User.jsonCreate.Type) =>
    pipe(
      repo.insert({
        ...user,
        createdAt: Model.Override(DateTime.unsafeNow()),
        updatedAt: Model.Override(DateTime.unsafeNow())
      }),
      Effect.withSpan("Users.create", { attributes: { user } })
    )

  const findById = (id: UserId) =>
    pipe(
      repo.findById(id),
      Effect.withSpan("Users.findById", { attributes: { id } })
    )

  const update = (id: UserId, user: typeof User.jsonUpdate.Type) =>
    pipe(
      repo.update({
        ...user,
        id,
        updatedAt: Model.Override(DateTime.unsafeNow())
      }),
      Effect.withSpan("Users.update", { attributes: { user } })
    )

  const delete_ = (id: UserId) =>
    pipe(
      repo.delete(id),
      Effect.withSpan("Users.delete", { attributes: { id } })
    )

  const with_ = <B, E, R>(
    id: UserId,
    f: (user: User) => Effect.Effect<B, E, R>
  ): Effect.Effect<B, E | UserNotFound, R> =>
    pipe(
      repo.findById(id),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new UserNotFound({ id })),
          onSome: Effect.succeed
        })
      ),
      Effect.flatMap(f),
      sql.withTransaction,
      Effect.catchTag("SqlError", (e) => Effect.die(e)),
      Effect.withSpan("Users.with", { attributes: { id } })
    )

  return { create, findById, update, delete: delete_, with: with_ }
})

export class Users extends Effect.Tag("Users")<
  Users,
  Effect.Effect.Success<typeof make>
>() {
  static layer = Layer.effect(Users, make)

  static Live = Users.layer.pipe(
    Layer.provide(SqlLive),
    Layer.provide(UserRepo.Live)
  )

  static Test = this.layer.pipe(
    Layer.provideMerge(SqlTest)
  )
}
