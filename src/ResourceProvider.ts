// src/ResourceProvider.ts
import { Effect, Option, Schema } from "effect"
import * as os from "os"
import { McpResource, ResourceTemplate, TextResourceContents } from "./Generated.js"

// Error types
export class ResourceNotFoundError extends Schema.TaggedError<ResourceNotFoundError>()("ResourceNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

export class ResourceValidationError extends Schema.TaggedError<ResourceValidationError>()("ResourceValidationError", {
  cause: Schema.Unknown,
  message: Schema.String,
  uri: Schema.String
}) {}

// Resource definition - with lazy handler
export class ResourceDefinition {
  constructor(
    readonly metadata: McpResource,
    readonly handler: () => Effect.Effect<TextResourceContents, ResourceNotFoundError>
  ) {}

  static make(
    metadata: McpResource,
    handler: () => Effect.Effect<TextResourceContents, ResourceNotFoundError>
  ) {
    return new ResourceDefinition(metadata, handler)
  }
}

// Template definition - resources with parameters
export class ResourceTemplateDefinition<P> {
  constructor(
    readonly template: ResourceTemplate,
    readonly paramSchema: Schema.Schema<P, any>,
    readonly generator: (params: P) => TextResourceContents
  ) {}

  static make<P>(
    template: ResourceTemplate,
    paramSchema: Schema.Schema<P, any>,
    generator: (params: P) => TextResourceContents
  ) {
    return new ResourceTemplateDefinition(template, paramSchema, generator)
  }

  // Process a template with parameters
  process(params: Record<string, string>) {
    const { generator, paramSchema } = this

    return Schema.decodeUnknown(paramSchema)(params).pipe(
      Effect.mapError((cause) =>
        new ResourceValidationError({
          cause,
          message: `Invalid parameters for resource template '${this.template.uriTemplate}'`,
          uri: this.template.uriTemplate
        })
      ),
      Effect.map((validParams) => generator(validParams))
    )
  }

  // Check if a URI matches this template
  matches(uri: string): Option.Option<Record<string, string>> {
    const regex = new RegExp(
      "^" + this.template.uriTemplate.replace(/\{([^}]+)\}/g, "(?<$1>[^/]+)") + "$"
    )

    const match = uri.match(regex)
    if (match && match.groups) {
      return Option.some(match.groups)
    }
    return Option.none()
  }
}

// Registry for resources
export class ResourceRegistryImpl {
  private resources = new Map<string, ResourceDefinition>()
  private templates = new Map<string, ResourceTemplateDefinition<any>>()

  registerResource(definition: ResourceDefinition) {
    this.resources.set(definition.metadata.uri, definition)
    return this
  }

  registerTemplate<P>(definition: ResourceTemplateDefinition<P>) {
    this.templates.set(definition.template.uriTemplate, definition)
    return this
  }

  getResource(uri: string) {
    return this.resources.get(uri)
  }

  getTemplateForUri(uri: string): Option.Option<[ResourceTemplateDefinition<any>, Record<string, string>]> {
    for (const template of this.templates.values()) {
      const params = template.matches(uri)
      if (Option.isSome(params)) {
        return Option.some([template, params.value])
      }
    }
    return Option.none()
  }

  listResources() {
    return Array.from(this.resources.values()).map((def) => def.metadata)
  }

  listTemplates() {
    return Array.from(this.templates.values()).map((def) => def.template)
  }
}

// Create the system info resource definition
export const SystemInfoResource = ResourceDefinition.make(
  McpResource.make({
    name: "System Information",
    uri: "system://info",
    mimeType: Option.some("application/json"),
    description: Option.some("System information resource"),
    size: Option.some(1024), // Approximate size
    annotations: Option.none()
  }),
  () =>
    Effect.sync(() => {
      const sysInfoData = {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        hostname: os.hostname(),
        type: os.type(),
        uptime: os.uptime()
      }

      return TextResourceContents.make({
        text: JSON.stringify(sysInfoData, null, 2),
        mimeType: Option.some("application/json"),
        uri: "system://info"
      })
    })
)

// Create the code snippet template definition
export const CodeSnippetTemplate = ResourceTemplateDefinition.make(
  ResourceTemplate.make({
    name: "Code Snippet",
    uriTemplate: "snippet://{language}/{type}",
    mimeType: Option.some("text/plain"),
    description: Option.some("Code snippet template"),
    annotations: Option.none()
  }),
  Schema.Struct({
    language: Schema.Union(
      Schema.Literal("typescript"),
      Schema.Literal("javascript"),
      Schema.Literal("python")
    ).annotations({ identifier: "Language" }),
    type: Schema.Union(
      Schema.Literal("function"),
      Schema.Literal("class"),
      Schema.Literal("api")
    ).annotations({ identifier: "SnippetType" })
  }).annotations({ identifier: "CodeSnippetParams" }),
  (params) => {
    const { language, type } = params
    let snippet = ""
    let mimeType = "text/plain"

    if (language === "typescript" || language === "javascript") {
      mimeType = language === "typescript" ? "application/typescript" : "application/javascript"

      if (type === "function") {
        snippet = language === "typescript"
          ? `function example(param: string): string {\n  return \`Hello, \${param}!\`;\n}`
          : `function example(param) {\n  return \`Hello, \${param}!\`;\n}`
      } else if (type === "class") {
        snippet = language === "typescript"
          ? `class Example {\n  private name: string;\n\n  constructor(name: string) {\n    this.name = name;\n  }\n\n  greet(): string {\n    return \`Hello, \${this.name}!\`;\n  }\n}`
          : `class Example {\n  constructor(name) {\n    this.name = name;\n  }\n\n  greet() {\n    return \`Hello, \${this.name}!\`;\n  }\n}`
      } else if (type === "api") {
        snippet = language === "typescript"
          ? `import express from 'express';\n\nconst app = express();\nconst port = 3000;\n\napp.get('/', (req: express.Request, res: express.Response) => {\n  res.json({ message: 'Hello, World!' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server running at http://localhost:\${port}\`);\n});`
          : `const express = require('express');\n\nconst app = express();\nconst port = 3000;\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello, World!' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server running at http://localhost:\${port}\`);\n});`
      }
    } else if (language === "python") {
      mimeType = "text/x-python"

      if (type === "function") {
        snippet = `def example(param):\n    return f"Hello, {param}!"`
      } else if (type === "class") {
        snippet =
          `class Example:\n    def __init__(self, name):\n        self.name = name\n        \n    def greet(self):\n        return f"Hello, {self.name}!"`
      } else if (type === "api") {
        snippet =
          `from flask import Flask, jsonify\n\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return jsonify(message="Hello, World!")\n\nif __name__ == '__main__':\n    app.run(port=3000)`
      }
    }

    if (!snippet) {
      snippet = `# Unsupported combination: ${language}/${type}`
    }

    return TextResourceContents.make({
      text: snippet,
      mimeType: Option.some(mimeType),
      uri: `snippet://${language}/${type}`
    })
  }
)

// Main resource provider service
export class ResourceProvider extends Effect.Service<ResourceProvider>()("ResourceProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    // Create resource registry
    const registry = new ResourceRegistryImpl()

    // Method to register new resources at runtime
    const registerResource = (definition: ResourceDefinition) => {
      registry.registerResource(definition)
      return Effect.succeed(true)
    }

    // Method to register new templates at runtime
    const registerTemplate = <P>(definition: ResourceTemplateDefinition<P>) => {
      registry.registerTemplate(definition)
      return Effect.succeed(true)
    }

    // Register built-in resources
    registry.registerResource(SystemInfoResource)

    // Register built-in templates
    registry.registerTemplate(CodeSnippetTemplate)

    // List all available resources
    const list = Effect.succeed(registry.listResources())

    // List all available templates
    const listTemplates = Effect.succeed(registry.listTemplates())

    // Read a resource by URI
    const read = (uri: string) =>
      Effect.gen(function*() {
        // First check if it's a direct resource
        const resourceDef = registry.getResource(uri)
        if (resourceDef) {
          // Execute the handler to get the resource content
          const resource = yield* resourceDef.handler()
          return [resource]
        }

        // If not, check if it matches any template
        const templateMatch = registry.getTemplateForUri(uri)

        if (Option.isSome(templateMatch)) {
          const [template, params] = templateMatch.value
          const result = yield* template.process(params)
          return [result]
        }

        // If no match found, return error
        throw new ResourceNotFoundError({
          cause: new Error(`Resource not found: ${uri}`),
          message: `Resource '${uri}' not found`
        })
      })

    return {
      list,
      listTemplates,
      read,
      registerResource,
      registerTemplate
    } as const
  })
}) {}
