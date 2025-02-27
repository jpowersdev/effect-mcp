import { Inspectable, Option, Schema } from "effect"
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
  id: Schema.optional(
    Schema.Union(Schema.String, Schema.Number)
  ),
  params: Schema.optionalWith(Schema.Any, { exact: true })
}) {
  [Inspectable.NodeInspectSymbol]() {
    const json = {
      _id: "JsonRpcRequest",
      method: this.method
    }

    if (this.id) {
      Object.assign(json, {
        id: this.id
      })
    }

    if (this.params) {
      Object.assign(json, {
        params: this.params
      })
    }

    return json
  }
}

export class JsonRpcSuccess extends Schema.Class<JsonRpcSuccess>("JsonRpcSuccess")({
  ...JsonRpcMessage.fields,
  id: Schema.optionalWith(
    Schema.Union(Schema.String, Schema.Number),
    { as: "Option" }
  ),
  result: Schema.Unknown
}) {
  [Inspectable.NodeInspectSymbol]() {
    const json = {
      _id: "JsonRpcSuccess",
      result: this.result
    }

    if (Option.isSome(this.id)) {
      Object.assign(json, {
        id: this.id.value
      })
    }

    return json
  }
}

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
}) {
  [Inspectable.NodeInspectSymbol]() {
    const json = {
      _id: "JsonRpcError",
      error: this.error
    }

    if (Option.isSome(this.id)) {
      Object.assign(json, {
        id: this.id.value
      })
    }

    return json
  }
}

export const JsonRpcResponse = Schema.Union(
  JsonRpcSuccess,
  JsonRpcError
)
export type JsonRpcResponse = Schema.Schema.Type<typeof JsonRpcResponse>

export class JsonRpcNotification extends Schema.Class<JsonRpcNotification>("JSONRPCNotification")({
  ...JsonRpcMessage.fields,
  method: Schema.String,
  params: Schema.optionalWith(Schema.Any, { exact: true })
}) {
  [Inspectable.NodeInspectSymbol]() {
    const json = {
      _id: "JsonRpcNotification",
      method: this.method
    }

    if (Option.isSome(this.params)) {
      Object.assign(json, {
        params: this.params.value
      })
    }

    return json
  }
}

export const ClientRequest = Schema.Union(
  Model.CallToolRequest,
  Model.CompleteRequest,
  Model.CreateMessageRequest,
  Model.GetPromptRequest,
  Model.InitializeRequest,
  Model.ListPromptsRequest,
  Model.ListResourcesRequest,
  Model.ListResourceTemplatesRequest,
  Model.ListRootsRequest,
  Model.ListToolsRequest,
  Model.ReadResourceRequest,
  Model.PingRequest,
  Model.InitializedNotification,
  Model.CancelledNotification
)

export type ClientRequest = Schema.Schema.Type<typeof ClientRequest>

export const ServerResult = Schema.Union(
  Model.CallToolResult,
  Model.CompleteResult,
  Model.CreateMessageResult,
  Model.GetPromptResult,
  Model.InitializeResult,
  Model.ListPromptsResult,
  Model.ListResourcesResult,
  Model.ListResourceTemplatesResult,
  Model.ListRootsResult,
  Model.ListToolsResult,
  Model.ReadResourceResult
)

export type ServerResult = Schema.Schema.Type<typeof ServerResult>

export const ServerResponse = Schema.Union(
  Schema.Struct({
    ...JsonRpcError.fields,
    result: ServerResult
  }),
  JsonRpcError
)

export type ServerResponse = Schema.Schema.Type<typeof ServerResponse>
