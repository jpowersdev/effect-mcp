import { Effect, Option } from "effect"
import { Implementation, ServerCapabilities } from "./Generated.js"

export class CapabilityProvider extends Effect.Service<CapabilityProvider>()("CapabilityProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const protocolVersion = "2024-11-05"

    // Server implementation details
    const serverInfo = Implementation.make({
      name: "ModelContextProtocolTransport",
      version: "1.0.0"
    })

    // Available capabilities
    const capabilities = ServerCapabilities.make({
      tools: Option.some({
        listChanged: Option.none()
      }),
      prompts: Option.some({
        listChanged: Option.none()
      }),
      resources: Option.some({
        listChanged: Option.none(),
        subscribe: Option.none(),
        templates: Option.some(true)
      }),
      logging: Option.some({
        level: Option.some("info" as const)
      }),
      experimental: Option.none()
    })

    const describe = Effect.succeed({
      capabilities,
      serverInfo,
      protocolVersion,
      instructions: Option.none()
    }).pipe(
      Effect.withSpan("CapabilityProvider.describe", {
        attributes: {
          protocolVersion,
          serverInfo,
          capabilities
        }
      })
    )

    return {
      describe
    } as const
  })
}) {}
