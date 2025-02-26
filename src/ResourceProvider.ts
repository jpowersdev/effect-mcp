// src/ResourceProvider.ts
import { Effect, Option, Schema } from "effect"
import * as os from "os"
import { McpResource, ResourceTemplate, TextResourceContents } from "./Generated.js"

export class ResourceNotFoundError extends Schema.TaggedError<ResourceNotFoundError>()("ResourceNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

export class ResourceProvider extends Effect.Service<ResourceProvider>()("ResourceProvider", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const resources = new Map<string, TextResourceContents>()
    const templates = new Map<string, (params: Record<string, string>) => TextResourceContents>()

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

    // Add a code snippet template
    templates.set("snippet://{language}/{type}", (params) => {
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
    })

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

    const listTemplates = Effect.succeed(
      Array.from(templates.keys()).map((uriTemplate) =>
        ResourceTemplate.make({
          name: uriTemplate,
          uriTemplate,
          mimeType: Option.some("text/plain"),
          description: Option.some("Code snippet template"),
          annotations: Option.none()
        })
      )
    )

    const read = (uri: string) =>
      Effect.try({
        try: () => {
          // First check if it's a direct resource
          const resource = resources.get(uri)
          if (resource) {
            return [resource]
          }

          // If not, check if it matches any template
          for (const [templatePattern, generator] of templates.entries()) {
            const regex = new RegExp(
              "^" +
                templatePattern.replace(/\{([^}]+)\}/g, "(?<$1>[^/]+)") +
                "$"
            )

            const match = uri.match(regex)
            if (match && match.groups) {
              return [generator(match.groups)]
            }
          }

          throw new Error(`Resource '${uri}' not found`)
        },
        catch: (cause) =>
          new ResourceNotFoundError({
            cause,
            message: `Resource '${uri}' not found`
          })
      })

    return {
      list,
      listTemplates,
      read
    } as const
  })
}) {}
