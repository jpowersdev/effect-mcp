import { JSONSchema, Option, Schema, SchemaAST } from "effect"

// Core domain models
export interface ToolSchema {
  readonly properties: Option.Option<Record<string, unknown>>
  readonly required: Option.Option<Array<string>>
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
export const Tool = {
  make: (params: {
    name: string
    description?: string
    inputSchema: {
      properties?: Record<string, unknown>
      required?: Array<string>
    }
  }): Tool => ({
    name: params.name,
    description: Option.fromNullable(params.description),
    inputSchema: {
      properties: Option.fromNullable(params.inputSchema.properties),
      required: Option.fromNullable(params.inputSchema.required)
    }
  })
}

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
  ).pipe(Option.getOrElse(() => ""))

  return Tool.make({
    name,
    description,
    inputSchema: {
      properties: (inputSchema as any).properties,
      required: (inputSchema as any).required
    }
  })
}
