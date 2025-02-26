import { Effect, Option } from "effect"
import { ServerCapabilities, ServerImplementation } from "./Domain/Capability.js"

export class CapabilityProvider extends Effect.Service<CapabilityProvider>()("CapabilityProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Protocol version
    const protocolVersion = "2024-11-05"

    // Server implementation details
    const implementation = ServerImplementation.make({
      name: "ModelContextProtocolTransport",
      version: "1.0.0"
    })

    // Available capabilities
    const capabilities = ServerCapabilities.make({
      tools: Option.some({
        listChanged: Option.none()
      }),
      // Only enable features we actually support
      prompts: Option.none(),
      logging: Option.some({
        level: "info"
      }),
      experimental: Option.none(),
      resources: Option.some({
        listChanged: Option.none(),
        subscribe: Option.none()
      })
    })

    const getProtocolVersion = Effect.succeed(protocolVersion)
    const getImplementation = Effect.succeed(implementation)
    const getCapabilities = Effect.succeed(capabilities)

    return {
      getProtocolVersion,
      getImplementation,
      getCapabilities
    } as const
  })
}) {}
