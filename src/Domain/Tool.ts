import { JSONSchema, Option, Schema, SchemaAST } from "effect"
import * as Model from "../Generated.js"

// Core domain models
export interface ToolSchema {
  readonly properties: Option.Option<Record<string, object>>
  readonly required: Option.Option<Array<string>>
  readonly type: "object"
}

export interface Tool {
  readonly name: string
  readonly description: Option.Option<string>
  readonly inputSchema: ToolSchema
}

// Core domain error
export class ToolError extends Schema.TaggedError<ToolError>()("ToolError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

// Factory and operations
export const Tool = Model.Tool

export const fromSchema = <S extends Schema.Schema.AnyNoContext>(schema: S) => {
  const jsonSchema = JSONSchema.make(schema)
  const name = SchemaAST.getJSONIdentifier(
    Schema.typeSchema(schema).ast
  ).pipe(Option.getOrElse(() => ""))

  const inputSchema = jsonSchema.$defs?.[name]
  if (!inputSchema) {
    throw new ToolError({
      message: `No input schema found for tool ${name}`
    })
  }

  const description = SchemaAST.getDescriptionAnnotation(
    Schema.typeSchema(schema).ast
  )

  return Tool.make({
    name,
    description,
    inputSchema: {
      properties: (inputSchema as any).properties,
      required: (inputSchema as any).required,
      type: "object"
    }
  })
}
