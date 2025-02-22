import { describe, expect, live } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { ApiClient } from "../src/client.js"
import { HttpLive } from "../src/Http.js"

describe("GreetingsApi", () => {
  live("should work", () =>
    Effect.gen(function*() {
      const client = yield* ApiClient

      yield* Layer.launch(HttpLive).pipe(Effect.fork)

      const result = yield* client.Greetings["hello-world"]({})

      expect(result).toBe("Hello, World!")
    }).pipe(
      Effect.provide([
        ApiClient.Default
      ])
    ))
})
