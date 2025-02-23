/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

export const Role = Schema.Union(Schema.Literal("assistant"), Schema.Literal("user"))
export type Role = typeof Role.Type

export class Annotated extends Schema.Class<Annotated>("Annotated")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class BlobResourceContents extends Schema.Class<BlobResourceContents>("BlobResourceContents")({
  blob: Schema.String,
  mimeType: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  uri: Schema.String
}) {}

export class CallToolRequest extends Schema.Class<CallToolRequest>("CallToolRequest")({
  method: Schema.Literal("tools/call"),
  params: Schema.Struct({
    arguments: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
      as: "Option",
      exact: true
    }),
    name: Schema.String
  })
}) {}

export class TextContent extends Schema.Class<TextContent>("TextContent")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  text: Schema.String,
  type: Schema.Literal("text")
}) {}

export class ImageContent extends Schema.Class<ImageContent>("ImageContent")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  data: Schema.String,
  mimeType: Schema.String,
  type: Schema.Literal("image")
}) {}

export class TextResourceContents extends Schema.Class<TextResourceContents>("TextResourceContents")({
  mimeType: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  text: Schema.String,
  uri: Schema.String
}) {}

export class EmbeddedResource extends Schema.Class<EmbeddedResource>("EmbeddedResource")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  resource: Schema.Union(TextResourceContents, BlobResourceContents),
  type: Schema.Literal("resource")
}) {}

export class CallToolResult extends Schema.Class<CallToolResult>("CallToolResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  content: Schema.Array(Schema.Union(TextContent, ImageContent, EmbeddedResource)).pipe(Schema.mutable),
  isError: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
}) {}

export const RequestId = Schema.Union(Schema.String, Schema.Number)
export type RequestId = typeof RequestId.Type

export class CancelledNotification extends Schema.Class<CancelledNotification>("CancelledNotification")({
  method: Schema.Literal("notifications/cancelled"),
  params: Schema.Struct({
    reason: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
    requestId: RequestId
  })
}) {}

export class ClientCapabilities extends Schema.Class<ClientCapabilities>("ClientCapabilities")({
  experimental: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Object }), {
    as: "Option",
    exact: true
  }),
  roots: Schema.optionalWith(
    Schema.Struct({
      listChanged: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  sampling: Schema.optionalWith(Schema.Object, { as: "Option", exact: true })
}) {}

export class InitializedNotification extends Schema.Class<InitializedNotification>("InitializedNotification")({
  method: Schema.Literal("notifications/initialized"),
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
        as: "Option",
        exact: true
      })
    }),
    { as: "Option", exact: true }
  )
}) {}

export const ProgressToken = Schema.Union(Schema.String, Schema.Number)
export type ProgressToken = typeof ProgressToken.Type

export class ProgressNotification extends Schema.Class<ProgressNotification>("ProgressNotification")({
  method: Schema.Literal("notifications/progress"),
  params: Schema.Struct({
    progress: Schema.Number,
    progressToken: ProgressToken,
    total: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
  })
}) {}

export class RootsListChangedNotification
  extends Schema.Class<RootsListChangedNotification>("RootsListChangedNotification")({
    method: Schema.Literal("notifications/roots/list_changed"),
    params: Schema.optionalWith(
      Schema.Struct({
        _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
          as: "Option",
          exact: true
        })
      }),
      { as: "Option", exact: true }
    )
  })
{}

export const ClientNotification = Schema.Union(
  CancelledNotification,
  InitializedNotification,
  ProgressNotification,
  RootsListChangedNotification
)
export type ClientNotification = typeof ClientNotification.Type

export class Implementation
  extends Schema.Class<Implementation>("Implementation")({ name: Schema.String, version: Schema.String })
{}

export class InitializeRequest extends Schema.Class<InitializeRequest>("InitializeRequest")({
  method: Schema.Literal("initialize"),
  params: Schema.Struct({
    capabilities: ClientCapabilities,
    clientInfo: Implementation,
    protocolVersion: Schema.String
  })
}) {}

export class PingRequest extends Schema.Class<PingRequest>("PingRequest")({
  method: Schema.Literal("ping"),
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(
        Schema.Struct({
          progressToken: Schema.optionalWith(ProgressToken, { as: "Option", exact: true })
        }),
        { as: "Option", exact: true }
      )
    }),
    { as: "Option", exact: true }
  )
}) {}

export class ListResourcesRequest extends Schema.Class<ListResourcesRequest>("ListResourcesRequest")({
  method: Schema.Literal("resources/list"),
  params: Schema.optionalWith(
    Schema.Struct({
      cursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class ListResourceTemplatesRequest
  extends Schema.Class<ListResourceTemplatesRequest>("ListResourceTemplatesRequest")({
    method: Schema.Literal("resources/templates/list"),
    params: Schema.optionalWith(
      Schema.Struct({
        cursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
      }),
      { as: "Option", exact: true }
    )
  })
{}

export class ReadResourceRequest extends Schema.Class<ReadResourceRequest>("ReadResourceRequest")({
  method: Schema.Literal("resources/read"),
  params: Schema.Struct({
    uri: Schema.String
  })
}) {}

export class SubscribeRequest extends Schema.Class<SubscribeRequest>("SubscribeRequest")({
  method: Schema.Literal("resources/subscribe"),
  params: Schema.Struct({
    uri: Schema.String
  })
}) {}

export class UnsubscribeRequest extends Schema.Class<UnsubscribeRequest>("UnsubscribeRequest")({
  method: Schema.Literal("resources/unsubscribe"),
  params: Schema.Struct({
    uri: Schema.String
  })
}) {}

export class ListPromptsRequest extends Schema.Class<ListPromptsRequest>("ListPromptsRequest")({
  method: Schema.Literal("prompts/list"),
  params: Schema.optionalWith(
    Schema.Struct({
      cursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class GetPromptRequest extends Schema.Class<GetPromptRequest>("GetPromptRequest")({
  method: Schema.Literal("prompts/get"),
  params: Schema.Struct({
    arguments: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
      as: "Option",
      exact: true
    }),
    name: Schema.String
  })
}) {}

export class ListToolsRequest extends Schema.Class<ListToolsRequest>("ListToolsRequest")({
  method: Schema.Literal("tools/list"),
  params: Schema.optionalWith(
    Schema.Struct({
      cursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export const LoggingLevel = Schema.Union(
  Schema.Literal("alert"),
  Schema.Literal("critical"),
  Schema.Literal("debug"),
  Schema.Literal("emergency"),
  Schema.Literal("error"),
  Schema.Literal("info"),
  Schema.Literal("notice"),
  Schema.Literal("warning")
)
export type LoggingLevel = typeof LoggingLevel.Type

export class SetLevelRequest extends Schema.Class<SetLevelRequest>("SetLevelRequest")({
  method: Schema.Literal("logging/setLevel"),
  params: Schema.Struct({
    level: LoggingLevel
  })
}) {}

export class PromptReference
  extends Schema.Class<PromptReference>("PromptReference")({ name: Schema.String, type: Schema.Literal("ref/prompt") })
{}

export class ResourceReference extends Schema.Class<ResourceReference>("ResourceReference")({
  type: Schema.Literal("ref/resource"),
  uri: Schema.String
}) {}

export class CompleteRequest extends Schema.Class<CompleteRequest>("CompleteRequest")({
  method: Schema.Literal("completion/complete"),
  params: Schema.Struct({
    argument: Schema.Struct({
      name: Schema.String,
      value: Schema.String
    }),
    ref: Schema.Union(PromptReference, ResourceReference)
  })
}) {}

export const ClientRequest = Schema.Union(
  InitializeRequest,
  PingRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ReadResourceRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  ListPromptsRequest,
  GetPromptRequest,
  ListToolsRequest,
  CallToolRequest,
  SetLevelRequest,
  CompleteRequest
)
export type ClientRequest = typeof ClientRequest.Type

export class Result extends Schema.Class<Result>("Result")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  })
}) {}

export class CreateMessageResult extends Schema.Class<CreateMessageResult>("CreateMessageResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  content: Schema.Union(TextContent, ImageContent),
  model: Schema.String,
  role: Role,
  stopReason: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
}) {}

export class Root extends Schema.Class<Root>("Root")({
  name: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  uri: Schema.String
}) {}

export class ListRootsResult extends Schema.Class<ListRootsResult>("ListRootsResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  roots: Schema.Array(Root).pipe(Schema.mutable)
}) {}

export const ClientResult = Schema.Union(Result, CreateMessageResult, ListRootsResult)
export type ClientResult = typeof ClientResult.Type

export class CompleteResult extends Schema.Class<CompleteResult>("CompleteResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  completion: Schema.Struct({
    hasMore: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true }),
    total: Schema.optionalWith(Schema.Number, { as: "Option", exact: true }),
    values: Schema.Array(Schema.String).pipe(Schema.mutable)
  })
}) {}

export class SamplingMessage extends Schema.Class<SamplingMessage>("SamplingMessage")({
  content: Schema.Union(TextContent, ImageContent),
  role: Role
}) {}

export class ModelHint extends Schema.Class<ModelHint>("ModelHint")({
  name: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
}) {}

export class ModelPreferences extends Schema.Class<ModelPreferences>("ModelPreferences")({
  costPriority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true }),
  hints: Schema.optionalWith(Schema.Array(ModelHint).pipe(Schema.mutable), { as: "Option", exact: true }),
  intelligencePriority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true }),
  speedPriority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
}) {}

export class CreateMessageRequest extends Schema.Class<CreateMessageRequest>("CreateMessageRequest")({
  method: Schema.Literal("sampling/createMessage"),
  params: Schema.Struct({
    includeContext: Schema.optionalWith(
      Schema.Union(Schema.Literal("allServers"), Schema.Literal("none"), Schema.Literal("thisServer")),
      { as: "Option", exact: true }
    ),
    maxTokens: Schema.Number,
    messages: Schema.Array(SamplingMessage).pipe(Schema.mutable),
    metadata: Schema.optionalWith(Schema.Object, { as: "Option", exact: true }),
    modelPreferences: Schema.optionalWith(ModelPreferences, { as: "Option", exact: true }),
    stopSequences: Schema.optionalWith(Schema.Array(Schema.String).pipe(Schema.mutable), {
      as: "Option",
      exact: true
    }),
    systemPrompt: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
    temperature: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
  })
}) {}

export const Cursor = Schema.String
export type Cursor = typeof Cursor.Type

export const EmptyResult = Result
export type EmptyResult = typeof EmptyResult.Type

export class PromptMessage extends Schema.Class<PromptMessage>("PromptMessage")({
  content: Schema.Union(TextContent, ImageContent, EmbeddedResource),
  role: Role
}) {}

export class GetPromptResult extends Schema.Class<GetPromptResult>("GetPromptResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  messages: Schema.Array(PromptMessage).pipe(Schema.mutable)
}) {}

export class ServerCapabilities extends Schema.Class<ServerCapabilities>("ServerCapabilities")({
  experimental: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Object }), {
    as: "Option",
    exact: true
  }),
  logging: Schema.optionalWith(Schema.Object, { as: "Option", exact: true }),
  prompts: Schema.optionalWith(
    Schema.Struct({
      listChanged: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  resources: Schema.optionalWith(
    Schema.Struct({
      listChanged: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true }),
      subscribe: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  tools: Schema.optionalWith(
    Schema.Struct({
      listChanged: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class InitializeResult extends Schema.Class<InitializeResult>("InitializeResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  capabilities: ServerCapabilities,
  instructions: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  protocolVersion: Schema.String,
  serverInfo: Implementation
}) {}

export class JSONRPCError extends Schema.Class<JSONRPCError>("JSONRPCError")({
  error: Schema.Struct({
    code: Schema.Number,
    data: Schema.optionalWith(Schema.Unknown, { as: "Option", exact: true }),
    message: Schema.String
  }),
  id: RequestId,
  jsonrpc: Schema.Literal("2.0")
}) {}

export class JSONRPCRequest extends Schema.Class<JSONRPCRequest>("JSONRPCRequest")({
  id: RequestId,
  jsonrpc: Schema.Literal("2.0"),
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(
        Schema.Struct({
          progressToken: Schema.optionalWith(ProgressToken, { as: "Option", exact: true })
        }),
        { as: "Option", exact: true }
      )
    }),
    { as: "Option", exact: true }
  )
}) {}

export class JSONRPCNotification extends Schema.Class<JSONRPCNotification>("JSONRPCNotification")({
  jsonrpc: Schema.Literal("2.0"),
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
        as: "Option",
        exact: true
      })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class JSONRPCResponse extends Schema.Class<JSONRPCResponse>("JSONRPCResponse")({
  id: RequestId,
  jsonrpc: Schema.Literal("2.0"),
  result: Result
}) {}

export const JSONRPCMessage = Schema.Union(JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError)
export type JSONRPCMessage = typeof JSONRPCMessage.Type

export class PromptArgument extends Schema.Class<PromptArgument>("PromptArgument")({
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  name: Schema.String,
  required: Schema.optionalWith(Schema.Boolean, { as: "Option", exact: true })
}) {}

export class Prompt extends Schema.Class<Prompt>("Prompt")({
  arguments: Schema.optionalWith(Schema.Array(PromptArgument).pipe(Schema.mutable), { as: "Option", exact: true }),
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  name: Schema.String
}) {}

export class ListPromptsResult extends Schema.Class<ListPromptsResult>("ListPromptsResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  nextCursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  prompts: Schema.Array(Prompt).pipe(Schema.mutable)
}) {}

export class ResourceTemplate extends Schema.Class<ResourceTemplate>("ResourceTemplate")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  mimeType: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  name: Schema.String,
  uriTemplate: Schema.String
}) {}

export class ListResourceTemplatesResult
  extends Schema.Class<ListResourceTemplatesResult>("ListResourceTemplatesResult")({
    _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
      as: "Option",
      exact: true
    }),
    nextCursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
    resourceTemplates: Schema.Array(ResourceTemplate).pipe(Schema.mutable)
  })
{}

export class McpResource extends Schema.Class<McpResource>("McpResource")({
  annotations: Schema.optionalWith(
    Schema.Struct({
      audience: Schema.optionalWith(Schema.Array(Role).pipe(Schema.mutable), { as: "Option", exact: true }),
      priority: Schema.optionalWith(Schema.Number, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  ),
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  mimeType: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  name: Schema.String,
  size: Schema.optionalWith(Schema.Number, { as: "Option", exact: true }),
  uri: Schema.String
}) {}

export class ListResourcesResult extends Schema.Class<ListResourcesResult>("ListResourcesResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  nextCursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  resources: Schema.Array(McpResource).pipe(Schema.mutable)
}) {}

export class ListRootsRequest extends Schema.Class<ListRootsRequest>("ListRootsRequest")({
  method: Schema.Literal("roots/list"),
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(
        Schema.Struct({
          progressToken: Schema.optionalWith(ProgressToken, { as: "Option", exact: true })
        }),
        { as: "Option", exact: true }
      )
    }),
    { as: "Option", exact: true }
  )
}) {}

export class Tool extends Schema.Class<Tool>("Tool")({
  description: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  inputSchema: Schema.Struct({
    properties: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Object }), {
      as: "Option",
      exact: true
    }),
    required: Schema.optionalWith(Schema.Array(Schema.String).pipe(Schema.mutable), { as: "Option", exact: true }),
    type: Schema.Literal("object")
  }),
  name: Schema.String
}) {}

export class ListToolsResult extends Schema.Class<ListToolsResult>("ListToolsResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  nextCursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  tools: Schema.Array(Tool).pipe(Schema.mutable)
}) {}

export class LoggingMessageNotification extends Schema.Class<LoggingMessageNotification>("LoggingMessageNotification")({
  method: Schema.Literal("notifications/message"),
  params: Schema.Struct({
    data: Schema.Unknown,
    level: LoggingLevel,
    logger: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
  })
}) {}

export class McpNotification extends Schema.Class<McpNotification>("McpNotification")({
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
        as: "Option",
        exact: true
      })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class PaginatedRequest extends Schema.Class<PaginatedRequest>("PaginatedRequest")({
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Struct({
      cursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
    }),
    { as: "Option", exact: true }
  )
}) {}

export class PaginatedResult extends Schema.Class<PaginatedResult>("PaginatedResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  nextCursor: Schema.optionalWith(Schema.String, { as: "Option", exact: true })
}) {}

export class PromptListChangedNotification
  extends Schema.Class<PromptListChangedNotification>("PromptListChangedNotification")({
    method: Schema.Literal("notifications/prompts/list_changed"),
    params: Schema.optionalWith(
      Schema.Struct({
        _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
          as: "Option",
          exact: true
        })
      }),
      { as: "Option", exact: true }
    )
  })
{}

export class ReadResourceResult extends Schema.Class<ReadResourceResult>("ReadResourceResult")({
  _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    as: "Option",
    exact: true
  }),
  contents: Schema.Array(Schema.Union(TextResourceContents, BlobResourceContents)).pipe(Schema.mutable)
}) {}

export class McpRequest extends Schema.Class<McpRequest>("McpRequest")({
  method: Schema.String,
  params: Schema.optionalWith(
    Schema.Struct({
      _meta: Schema.optionalWith(
        Schema.Struct({
          progressToken: Schema.optionalWith(ProgressToken, { as: "Option", exact: true })
        }),
        { as: "Option", exact: true }
      )
    }),
    { as: "Option", exact: true }
  )
}) {}

export class ResourceContents extends Schema.Class<ResourceContents>("ResourceContents")({
  mimeType: Schema.optionalWith(Schema.String, { as: "Option", exact: true }),
  uri: Schema.String
}) {}

export class ResourceListChangedNotification
  extends Schema.Class<ResourceListChangedNotification>("ResourceListChangedNotification")({
    method: Schema.Literal("notifications/resources/list_changed"),
    params: Schema.optionalWith(
      Schema.Struct({
        _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
          as: "Option",
          exact: true
        })
      }),
      { as: "Option", exact: true }
    )
  })
{}

export class ResourceUpdatedNotification
  extends Schema.Class<ResourceUpdatedNotification>("ResourceUpdatedNotification")({
    method: Schema.Literal("notifications/resources/updated"),
    params: Schema.Struct({
      uri: Schema.String
    })
  })
{}

export class ToolListChangedNotification
  extends Schema.Class<ToolListChangedNotification>("ToolListChangedNotification")({
    method: Schema.Literal("notifications/tools/list_changed"),
    params: Schema.optionalWith(
      Schema.Struct({
        _meta: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
          as: "Option",
          exact: true
        })
      }),
      { as: "Option", exact: true }
    )
  })
{}

export const ServerNotification = Schema.Union(
  CancelledNotification,
  ProgressNotification,
  ResourceListChangedNotification,
  ResourceUpdatedNotification,
  PromptListChangedNotification,
  ToolListChangedNotification,
  LoggingMessageNotification
)
export type ServerNotification = typeof ServerNotification.Type

export const ServerRequest = Schema.Union(PingRequest, CreateMessageRequest, ListRootsRequest)
export type ServerRequest = typeof ServerRequest.Type

export const ServerResult = Schema.Union(
  Result,
  InitializeResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  ListPromptsResult,
  GetPromptResult,
  ListToolsResult,
  CallToolResult,
  CompleteResult
)
export type ServerResult = typeof ServerResult.Type
