import type { Option } from "effect"
import * as Model from "../Generated.js"

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
export const ServerCapabilities = Model.ServerCapabilities

// Server implementation info
export interface ServerImplementation {
  readonly name: string
  readonly version: string
  readonly protocolVersion: string
}

export const ServerImplementation = Model.Implementation
