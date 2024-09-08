import { Schema } from "@effect/schema"
import { Model, SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import type { Option } from "effect"
import { Effect, Layer } from "effect"
import { SqlClientLive } from "./SqlClient.js"

export const UserId = Schema.UUID.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export class User extends Model.Class<User>("User")({
  id: Model.Generated(UserId),
  name: Schema.String,
  createdAt: Model.DateTimeInsertFromDate,
  updatedAt: Model.DateTimeUpdateFromDate
}) {}

export const makeUserRepository = Model.makeRepository(
  User,
  {
    tableName: "users",
    spanPrefix: "user",
    idColumn: "id"
  }
)

export class UserRepository extends Effect.Tag("UserRepository")<UserRepository, {
  findById: (id: UserId) => Effect.Effect<
    Option.Option<typeof User.Type>,
    never,
    typeof User.Context
  >
  insert: (
    insert: typeof User.insert.Type
  ) => Effect.Effect<
    typeof User.Type,
    never,
    typeof User.Context | typeof User.insert.Context
  >
  update: (
    update: typeof User.update.Type
  ) => Effect.Effect<
    typeof User.Type,
    never,
    typeof User.Context | typeof User.update.Context
  >
  delete: (id: UserId) => Effect.Effect<
    void,
    never,
    typeof User.Context
  >
}>() {
}

export const UserRepositoryLive = Layer.effect(UserRepository, makeUserRepository).pipe(
  Layer.provide(SqlClientLive)
)
