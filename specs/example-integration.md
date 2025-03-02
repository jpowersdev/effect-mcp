# Integration System Example

This example shows how to create and register a custom integration for the MCP server.

## Creating an Integration

```typescript
import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import * as Option from "effect/Option"
import * as Integration from "../Domain/Integration"
import * as ResourceProvider from "../ResourceProvider"
import * as Tool from "../Domain/Tool"
import * as IntegrationResourceTemplates from "../IntegrationResourceTemplates"

/**
 * Define configuration schema for the integration
 */
export const MyServiceConfig = Schema.Struct({
  apiKey: Schema.String,
  baseUrl: Schema.Optional(Schema.String, { default: () => "https://api.myservice.com" })
})

export type MyServiceConfig = Schema.Schema.Type<typeof MyServiceConfig>

/**
 * Create an integration definition
 */
export const MyServiceIntegration = Integration.makeIntegrationDefinition(
  Integration.makeIntegration({
    name: "myservice",
    displayName: "My Service",
    description: Option.some("Integration with My Service API"),
    version: Option.some("1.0.0"),
    author: Option.some("MCP Team"),
    homepage: Option.some("https://myservice.com"),
    annotations: Option.none()
  }),
  MyServiceConfig,
  (config) => 
    Effect.succeed(
      Integration.makeIntegrationStatus({
        name: "myservice",
        status: "available",
        message: Option.some("My Service integration is available"),
        timestamp: Date.now()
      })
    )
)

/**
 * Define a resource template for the integration
 */
export const MyServiceUserParams = Schema.Extend(
  IntegrationResourceTemplates.IntegrationResourceBaseParams,
  Schema.Struct({
    integration: Schema.Literal("myservice"),
    path: Schema.Transform(
      Schema.String,
      Schema.Struct({
        userId: Schema.String
      }),
      (path) => {
        const parts = path.split("/")
        if (parts[0] !== "user" || parts.length !== 2) {
          throw new Error("Invalid path format. Expected: user/{userId}")
        }
        return {
          userId: parts[1]
        }
      },
      ({ userId }) => `user/${userId}`
    )
  })
)

export const MyServiceUserTemplate = IntegrationResourceTemplates.makeIntegrationResourceTemplate(
  "My Service User",
  "Returns information about a user from My Service API",
  MyServiceUserParams,
  (params, integration) =>
    Effect.gen(function*() {
      const config = yield* Integration.IntegrationDefinitionProto.validateConfig(integration, {})
      const { userId } = params.path

      // In a real implementation, this would make an API call to the service
      // Here we're just mocking the response for demonstration
      const userInfo = {
        id: userId,
        username: `user_${userId}`,
        email: `user_${userId}@example.com`,
        createdAt: new Date().toISOString()
      }

      return ResourceProvider.TextResourceContents.make({
        text: JSON.stringify(userInfo, null, 2),
        mimeType: Option.some("application/json"),
        uri: `integrations://myservice/user/${userId}`
      })
    })
)

/**
 * Define a tool for the integration
 */
export const MyServiceSearchToolInput = Schema.Struct({
  query: Schema.String,
  limit: Schema.Optional(Schema.Number, { default: () => 10 })
})

export type MyServiceSearchToolInput = Schema.Schema.Type<typeof MyServiceSearchToolInput>

export const MyServiceSearchToolOutput = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    url: Schema.String
  })
)

export type MyServiceSearchToolOutput = Schema.Schema.Type<typeof MyServiceSearchToolOutput>

export const MyServiceSearchTool = Tool.ToolDefinition.make(
  {
    name: "myservice.search",
    displayName: "My Service Search",
    description: "Search for resources in My Service",
    annotations: Option.none()
  },
  MyServiceSearchToolInput,
  MyServiceSearchToolOutput,
  (input) => 
    Effect.succeed([
      // Mock response - in a real implementation, this would call the service API
      {
        id: "item-1",
        title: `Result for: ${input.query}`,
        description: "This is a sample search result",
        url: `https://myservice.com/item-1`
      },
      {
        id: "item-2",
        title: `Another result for: ${input.query}`,
        description: "This is another sample search result",
        url: `https://myservice.com/item-2`
      }
    ])
)

/**
 * Export all components of the integration
 */
export const MyServiceResourceTemplates = [
  MyServiceUserTemplate
]

export const MyServiceTools = [
  MyServiceSearchTool
]
```

## Registering an Integration

To register this integration with the MCP server:

```typescript
import { Effect } from "effect"
import * as IntegrationManager from "./IntegrationManager"
import * as MyService from "./integrations/MyService"

const program = Effect.gen(function*() {
  // Register the integration
  yield* IntegrationManager.registerIntegration(
    MyService.MyServiceIntegration,
    MyService.MyServiceResourceTemplates,
    MyService.MyServiceTools
  )
  
  console.log("My Service integration registered successfully")
})

// Run the program
program.pipe(
  Effect.provide(IntegrationManager.IntegrationManager.Live),
  Effect.runPromise
)
```

## Using the Integration

Once registered, the integration can be used via resources and tools:

```typescript
// Via resource URI
const userResource = yield* resourceProvider.read("integrations://myservice/user/123")

// Via tool
const results = yield* toolRegistry.execute("myservice.search", { query: "example" })

// Check integration status
const status = yield* IntegrationManager.getIntegrationStatus("myservice")

// List all integrations
const allIntegrations = yield* IntegrationRegistry.listIntegrations()
```