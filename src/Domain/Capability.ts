import { Option } from "effect"

// Core domain models
export interface ToolCapabilities {
  readonly listChanged: Option.Option<boolean>
}

export interface PromptCapabilities {
  readonly listChanged: Option.Option<boolean>
}

export interface LoggingCapabilities {
  readonly level: Option.Option<"debug" | "info" | "warn" | "error">
}

export interface ServerCapabilities {
  readonly tools: Option.Option<ToolCapabilities>
  readonly prompts: Option.Option<PromptCapabilities>
  readonly logging: Option.Option<LoggingCapabilities>
  readonly experimental: Option.Option<Record<string, unknown>>
}

// Factory and operations
export const ServerCapabilities = {
  make: (params: {
    tools?: { listChanged?: boolean } | undefined
    prompts?: { listChanged?: boolean } | undefined
    logging?: { level?: "debug" | "info" | "warn" | "error" } | undefined
    experimental?: Record<string, unknown> | undefined
  }): ServerCapabilities => ({
    tools: Option.map(
      Option.fromNullable(params.tools),
      (tools) => ({
        listChanged: Option.fromNullable(tools.listChanged)
      })
    ),
    prompts: Option.map(
      Option.fromNullable(params.prompts),
      (prompts) => ({
        listChanged: Option.fromNullable(prompts.listChanged)
      })
    ),
    logging: Option.map(
      Option.fromNullable(params.logging),
      (logging) => ({
        level: Option.fromNullable(logging.level)
      })
    ),
    experimental: Option.fromNullable(params.experimental)
  })
}

// Server implementation info
export interface ServerImplementation {
  readonly name: string
  readonly version: string
  readonly protocolVersion: string
}

export const ServerImplementation = {
  make: (params: {
    name: string
    version: string
    protocolVersion: string
  }): ServerImplementation => ({
    name: params.name,
    version: params.version,
    protocolVersion: params.protocolVersion
  })
}
