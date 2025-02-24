import { Schema } from "effect"
import * as Model from "../Generated.js"

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
  method: Schema.String,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  params: Schema.optionalWith(
    Schema.Any,
    { as: "Option", exact: true }
  )
}) {}

export class JsonRpcSuccess extends Schema.Class<JsonRpcSuccess>("JsonRpcSuccess")({
  ...JsonRpcMessage.fields,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  result: Schema.Unknown
}) {}

export class JsonRpcError extends Schema.Class<JsonRpcError>("JsonRpcError")({
  ...JsonRpcMessage.fields,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  error: Schema.Struct({
    code: Schema.Number,
    message: Schema.String,
    data: Schema.Option(Schema.Unknown)
  })
}) {}

export const JsonRpcResponse = Schema.Union(
  JsonRpcSuccess,
  JsonRpcError
)
export type JsonRpcResponse = Schema.Schema.Type<typeof JsonRpcResponse>

export class JsonRpcNotification extends Schema.Class<JsonRpcNotification>("JSONRPCNotification")({
  ...JsonRpcMessage.fields,
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Any,
    { as: "Option", exact: true }
  )
}) {}

export const ServerResult = Schema.Union(
  Model.InitializeResult,
  Model.ListResourcesResult,
  Model.ListResourceTemplatesResult,
  Model.ReadResourceResult,
  Model.ListPromptsResult,
  Model.GetPromptResult,
  Model.ListToolsResult,
  Model.CallToolResult,
  Model.CompleteResult
)

export type ServerResult = Schema.Schema.Type<typeof ServerResult>
