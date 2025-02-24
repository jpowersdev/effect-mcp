import { Effect } from "effect"
import { ServerCapabilities, ServerImplementation } from "./Domain/Capability.js"

export class CapabilityProvider extends Effect.Service<CapabilityProvider>()("CapabilityProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Server implementation details
    const implementation = ServerImplementation.make({
      name: "ModelContextProtocolTransport",
      version: "1.0.0",
      protocolVersion: "2024-11-05"
    })

    // Available capabilities
    const capabilities = ServerCapabilities.make({
      tools: {
        listChanged: false
      },
      // Only enable features we actually support
      prompts: undefined,
      logging: {
        level: "info"
      },
      experimental: undefined
    })

    const getImplementation = Effect.succeed(implementation)
    const getCapabilities = Effect.succeed(capabilities)

    return {
      getImplementation,
      getCapabilities
    } as const
  })
}) {}
