import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { describe, effect, expect, live } from "@effect/vitest"
import { SqlTest } from "app/Sql"
import { Effect, Equal, Fiber, Layer } from "effect"
import { Api } from "../src/Api.js"
import { HttpLive } from "../src/Http.js"

describe("UsersApi", () => {
  live("should work", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api, {
        baseUrl: "http://localhost:3000"
      })

      const fiber = yield* Layer.launch(HttpLive).pipe(Effect.fork)

      const user = yield* client.users.create({
        payload: { name: "James" }
      })

      expect(user.name).toBe("James")

      const updated = yield* client.users.update({
        path: { id: user.id },
        payload: { name: "Jim" }
      })

      expect(updated.name).toBe("Jim")

      const byId = yield* client.users.findById({
        path: { id: user.id }
      })

      expect(byId.id).toStrictEqual(updated.id)
      expect(byId.name).toStrictEqual(updated.name)
      expect(byId.createdAt).toStrictEqual(updated.createdAt)
      expect(byId.updatedAt).toStrictEqual(updated.updatedAt)

      const result = yield* client.users.delete({
        path: { id: user.id }
      })

      expect(result).toBe(undefined)

      yield* Fiber.interrupt(fiber)
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(SqlTest)
    ))
})
