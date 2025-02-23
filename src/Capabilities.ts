import { Effect, Option } from "effect"
import { ServerCapabilities } from "./Generated.js"

export class Capabilities extends Effect.Service<Capabilities>()("Capabilities", {
  dependencies: [],
  effect: Effect.gen(function*() {
    const list = Effect.succeed(
      ServerCapabilities.make({
        prompts: Option.none(),
        tools: Option.some({
          listChanged: Option.none()
        }),
        resources: Option.none(),
        logging: Option.none(),
        experimental: Option.none()
      })
    )

    return { list } as const
  })
}) {}
