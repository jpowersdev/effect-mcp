import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { JsonRpcRequest, JsonRpcResponse } from "./Domain/JsonRpc.js"
import { SessionNotFoundError } from "./Session.js"

export class McpApi extends HttpApiGroup.make("mcp")
  .add(
    HttpApiEndpoint.get("index")`/`
      .addSuccess(Schema.String, { status: 200 })
      .annotate(OpenApi.Title, "Index")
  )
  .add(
    HttpApiEndpoint.post("send-message")`/messages`
      .setUrlParams(Schema.Struct({
        sessionId: Schema.String
      }))
      .setPayload(JsonRpcRequest)
      .addError(SessionNotFoundError, { status: 404 })
      .addSuccess(Schema.Boolean, { status: 200 })
      .annotate(OpenApi.Title, "Create a Message")
      .annotate(OpenApi.Description, "Create a new message")
  )
  .add(
    HttpApiEndpoint.get("message-stream")`/messages`
      .addSuccess(JsonRpcResponse, { status: 200 })
      .annotate(OpenApi.Title, "Message Stream by way of Server-Sent Events")
      .annotate(OpenApi.Description, "Stream of messages")
  )
  .annotate(OpenApi.Title, "Model Context Protocol")
{}

export class Api extends HttpApi.make("Api")
  .add(McpApi)
{}
