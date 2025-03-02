import { Schema } from "effect"

const JsonRpcVersion = Schema.Literal("2.0").pipe(
  Schema.propertySignature,
  Schema.withConstructorDefault(
    () => "2.0" as const
  )
)

// Request message
export class JsonRpcRequest extends Schema.Class<JsonRpcRequest>("JsonRpcRequest")({
  jsonrpc: JsonRpcVersion,
  method: Schema.String,
  id: Schema.optional(
    Schema.Union(Schema.String, Schema.Number)
  ),
  params: Schema.optionalWith(Schema.Any, { exact: true })
}) {
}

// Success response
export class JsonRpcSuccess extends Schema.Class<JsonRpcSuccess>("JsonRpcSuccess")({
  jsonrpc: JsonRpcVersion,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  result: Schema.Any
}) {
}

// Error response
export class JsonRpcError extends Schema.Class<JsonRpcError>("JsonRpcError")({
  jsonrpc: JsonRpcVersion,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  error: Schema.Struct({
    code: Schema.Number,
    message: Schema.String,
    data: Schema.Option(Schema.Unknown)
  })
}) {
}

// Notification message (no id)
export class JsonRpcNotification extends Schema.Class<JsonRpcNotification>("JSONRPCNotification")({
  jsonrpc: JsonRpcVersion,
  method: Schema.String,
  params: Schema.optionalWith(Schema.Any, { exact: true })
}) {
}

// Union type for responses
export const JsonRpcResponse = Schema.Union(
  JsonRpcSuccess,
  JsonRpcNotification,
  JsonRpcError
)
export type JsonRpcResponse = Schema.Schema.Type<typeof JsonRpcResponse>
