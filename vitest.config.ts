import * as Path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: [Path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    alias: {
      app: Path.join(__dirname, "src")
    }
  }
})
