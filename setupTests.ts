import * as it from "@effect/vitest"

it.addEqualityTesters()

it.vi.stubEnv("PORT", "3000")
