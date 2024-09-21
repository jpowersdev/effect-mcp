import { HttpApiSchema } from "@effect/platform"
import { Schema } from "@effect/schema"
import { Model } from "@effect/sql"
import type { Equivalence } from "effect"
import { Equal, Hash } from "effect"

export const UserId = Schema.Number.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const UserIdFromString = Schema.NumberFromString.pipe(
  Schema.compose(UserId)
)

export class User extends Model.Class<User>("User")({
  id: Model.Generated(UserId),
  name: Schema.String,
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate
}, {
  equivalence: (/**typeParameters**/): Equivalence.Equivalence<User> => (s1, s2) => s1.id === s2.id
}) {
  // Defines equality based on id, name, and age
  [Equal.symbol](that: Equal.Equal): boolean {
    if (that instanceof User) {
      return (
        Equal.equals(this.id, that.id) &&
        Equal.equals(this.name, that.name)
      )
    }
    return false
  }

  // Generates a hash code based primarily on the unique id
  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }
}

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {},
  HttpApiSchema.annotations({
    status: 404
  })
) {}
