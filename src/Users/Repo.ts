import { Model } from "@effect/sql"
import { Cache, Effect, Layer } from "effect"
import type { UserId } from "../Domain/User.js"
import { User } from "../Domain/User.js"
import { SqlLive } from "../Sql.js"

export const make = Effect.gen(function*() {
  const repo = yield* Model.makeRepository(User, {
    tableName: "users",
    spanPrefix: "user",
    idColumn: "id"
  })

  const findById = yield* Cache.make({
    lookup: repo.findById,
    capacity: 1024,
    timeToLive: 30_000
  })

  return {
    ...repo,
    findById(id: UserId) {
      return findById.get(id)
    }
  }
})

export class UserRepo extends Effect.Tag("UserRepository")<
  UserRepo,
  Effect.Effect.Success<typeof make>
>() {
  static layer = Layer.effect(UserRepo, make)

  static Live = Layer.provide(UserRepo.layer, SqlLive)
}
