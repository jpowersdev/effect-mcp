import { Effect } from "effect"
import { Implementation as Implementation_ } from "./Generated.js"

export class Implementation extends Effect.Service<Implementation>()("Implementation", {
  dependencies: [],
  effect: Effect.gen(function*() {
    const serverInfo = Effect.succeed(Implementation_.make({
      name: "ModelContextProtocolTransport",
      version: "1.0.0"
    }))

    const protocolVersion = Effect.succeed("2024-11-05")

    return { serverInfo, protocolVersion } as const
  })
}) {}
