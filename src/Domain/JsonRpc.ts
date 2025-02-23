import { Schema } from "effect"

export const JsonRpcMessage = Schema.Struct({
  jsonrpc: Schema.Literal("2.0").pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(
      () => "2.0" as const
    )
  )
})

export class JsonRpcRequest extends Schema.Class<JsonRpcRequest>("JsonRpcRequest")({
  ...JsonRpcMessage.fields,
  id: Schema.Union(Schema.String, Schema.Number),
  method: Schema.String,
  params: Schema.optionalWith(Schema.Unknown, { as: "Option" })
}) {}

export class JsonRpcSuccess extends Schema.Class<JsonRpcSuccess>("JsonRpcSuccess")({
  ...JsonRpcMessage.fields,
  id: Schema.Union(Schema.String, Schema.Number),
  result: Schema.Unknown
}) {}

export class JsonRpcFailure extends Schema.Class<JsonRpcFailure>("JsonRpcFailure")({
  ...JsonRpcMessage.fields,
  id: Schema.Union(Schema.String, Schema.Number),
  error: Schema.Unknown
}) {}

export const JsonRpcResponse = Schema.Union(JsonRpcSuccess, JsonRpcFailure)
export type JsonRpcResponse = Schema.Schema.Type<typeof JsonRpcResponse>

export class JsonRpcNotification extends Schema.Class<JsonRpcNotification>("JSONRPCNotification")({
  ...JsonRpcMessage.fields,
  method: Schema.String,
  params: Schema.Unknown
}) {}
