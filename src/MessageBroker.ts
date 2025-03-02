import { Duration, Effect, Mailbox, Option, Queue, RcMap, Schedule, Schema, Stream, Struct } from "effect"
import type { JsonRpcRequest } from "./JsonRpc.js"
import { JsonRpcNotification, JsonRpcResponse } from "./JsonRpc.js"
import { McpProtocolAdapter } from "./McpProtocolAdapter.js"
import type { SessionId } from "./SessionManager.js"
import { CurrentSession, SessionManager } from "./SessionManager.js"

export interface Message {
  readonly sessionId: SessionId
  readonly payload: JsonRpcRequest
}

export const messageAnnotations = (message: Message) => {
  const annotations = {
    "session.id": message.sessionId,
    "mcp.method": message.payload.method
  }

  if (message.payload.id) {
    Object.assign(annotations, {
      "mcp.id": message.payload.id
    })
  }

  if (message.payload.params) {
    Object.assign(annotations, {
      "mcp.params": message.payload.params
    })
  }

  return annotations
}

export class MessageBrokerError extends Schema.TaggedError<MessageBrokerError>()("MessageBrokerError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class MessageBroker extends Effect.Service<MessageBroker>()("MessageBroker", {
  dependencies: [SessionManager.Default, McpProtocolAdapter.Default],
  scoped: Effect.gen(function*() {
    const sessions = yield* SessionManager
    const protocolAdapter = yield* McpProtocolAdapter
    const queue = yield* Queue.bounded<Message>(100)

    // Create a map of session-specific mailboxes
    const mailboxes = yield* RcMap.make({
      // Factory function to create new mailbox for a session
      lookup: () => Mailbox.make<JsonRpcResponse>(),
      // Clean up inactive mailboxes after 1 minute
      idleTimeToLive: Duration.minutes(1)
    })

    // Start processing pipeline
    yield* Stream.fromQueue(queue).pipe(
      Stream.tap(() => Effect.log(`Received message`)),
      Stream.mapEffect(({ payload, sessionId }) =>
        Effect.gen(function*() {
          // Get the session
          const session = yield* sessions.findById(sessionId)

          // Skip processing for non-activated sessions except for initialize and notifications/initialized
          const shouldProcess = ["initialize", "notifications/initialized"].includes(payload.method) ||
            session.activatedAt._tag === "Some"

          if (!shouldProcess) {
            yield* Effect.log(`Skipping ${payload.method} for inactive session`)
            return
          }

          // Process the request using McpProtocolAdapter
          yield* protocolAdapter.processRequest(session, payload).pipe(
            Effect.flatMap(Option.match({
              onNone: () => Effect.void,
              onSome: (response) =>
                RcMap.get(mailboxes, session.id).pipe(
                  Effect.flatMap((mailbox) => mailbox.offer(response))
                )
            }))
          )
        }).pipe(
          Effect.annotateLogs(messageAnnotations({ payload, sessionId })),
          Effect.withSpan("MessageBroker.processMessage", {
            attributes: {
              sessionId,
              method: payload.method,
              id: payload.id
            }
          })
        )
      ),
      Stream.runDrain,
      Effect.fork
    )

    // Stream messages for a specific session
    const messages = (sessionId: SessionId) =>
      Effect.gen(function*() {
        // Get or create mailbox for session
        const mailbox = yield* RcMap.get(mailboxes, sessionId)

        // Create endpoint URL for client publishing
        const endpoint = `/messages?sessionId=${sessionId}`

        // Create initial greeting with endpoint
        const greeting = Stream.make(`event: endpoint\ndata: ${endpoint}\n\n`)

        // Create recurring ping stream every 30 seconds
        const ping = Stream.fromSchedule(Schedule.spaced("30 seconds")).pipe(
          Stream.map(() => JsonRpcNotification.make({ method: "ping" })),
          Stream.mapEffect((_) => Schema.encodeUnknown(Schema.parseJson(JsonRpcNotification))(_)),
          Stream.map((payload) => `event: message\ndata: ${payload}\n\n`)
        )

        // Stream of messages from the mailbox
        const messageStream = Mailbox.toStream(mailbox).pipe(
          Stream.map((_) => Struct.omit(_ as any, "_tag")),
          Stream.mapEffect((response) => Schema.encodeUnknown(Schema.parseJson(JsonRpcResponse))(response)),
          Stream.tap((response) =>
            Effect.log("sending response").pipe(
              Effect.annotateLogs({ response })
            )
          ),
          Stream.map((response) => `event: message\ndata: ${response}\n\n`)
        )

        return greeting.pipe(
          Stream.merge(ping),
          Stream.merge(messageStream),
          Stream.onDone(() => Effect.succeed("event:done\ndata:finished\n\n")),
          Stream.withSpan("MessageBroker.messages", {
            attributes: { sessionId }
          })
        )
      }).pipe(
        Effect.provideServiceEffect(CurrentSession, sessions.findById(sessionId))
      )

    // Offer a new message to processing
    const offer = (message: Message) =>
      queue.offer(message).pipe(
        Effect.withSpan("MessageBroker.offer", {
          attributes: messageAnnotations(message)
        })
      )

    return {
      messages,
      offer
    } as const
  })
}) {}
