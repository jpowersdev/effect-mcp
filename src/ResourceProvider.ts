// src/ResourceProvider.ts
import { Effect, Option, Schema } from "effect"
import * as os from "os"
import { McpResource, TextResourceContents } from "./Generated.js"

export class ResourceNotFoundError extends Schema.TaggedError<ResourceNotFoundError>()("ResourceNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

export class ResourceProvider extends Effect.Service<ResourceProvider>()("ResourceProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const resources = new Map<string, TextResourceContents>()

    // Initialize with system info resource
    const sysInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: os.totalmem(),
      hostname: os.hostname(),
      type: os.type(),
      uptime: os.uptime()
    }

    resources.set(
      "system://info",
      TextResourceContents.make({
        text: JSON.stringify(sysInfo, null, 2),
        mimeType: Option.some("application/json"),
        uri: "system://info"
      })
    )

    const list = Effect.succeed(
      Array.from(resources.keys()).map((uri) =>
        McpResource.make({
          name: uri,
          uri,
          mimeType: Option.fromNullable(resources.get(uri)).pipe(Option.flatMap((_) => _.mimeType)),
          description: Option.some("System information resource"),
          size: Option.fromNullable(resources.get(uri)).pipe(Option.map((_) => _.text.length)),
          annotations: Option.none()
        })
      )
    )

    const read = (uri: string) =>
      Effect.try({
        try: () => {
          const resource = resources.get(uri)
          if (!resource) {
            throw new Error(`Resource '${uri}' not found`)
          }
          return [resource]
        },
        catch: (cause) =>
          new ResourceNotFoundError({
            cause,
            message: `Resource '${uri}' not found`
          })
      })

    return {
      list,
      read
    } as const
  })
}) {}
