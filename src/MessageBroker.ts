import { Duration, Effect, Mailbox, Option, Predicate, Queue, RcMap, Schedule, Schema, Stream, Struct } from "effect"
import { JsonRpcRequest, JsonRpcResponse } from "./Domain/JsonRpc.js"
import type { SessionId } from "./Domain/Session.js"
import { SessionManager } from "./SessionManager.js"
import { Transport } from "./Transport.js"

export interface Message {
  readonly sessionId: SessionId
  readonly payload: JsonRpcRequest
}

export class MessageBrokerError extends Schema.TaggedError<MessageBrokerError>()("MessageBrokerError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class MessageBroker extends Effect.Service<MessageBroker>()("MessageBroker", {
  dependencies: [SessionManager.Default, Transport.Default],
  scoped: Effect.gen(function*() {
    const sessions = yield* SessionManager
    const transport = yield* Transport
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
      Stream.mapEffect(({ payload, sessionId }) =>
        Effect.log(`Processing ${payload.method}`).pipe(
          Effect.andThen(() => transport.handle(sessionId, payload)),
          Effect.tapErrorCause(Effect.logError),
          Effect.catchAllCause((cause) =>
            Effect.logError(cause).pipe(
              Effect.map(() => ({
                jsonrpc: "2.0",
                id: payload.id,
                error: {
                  code: -32000,
                  message: "Internal server error"
                }
              } as JsonRpcResponse))
            )
          ),
          Effect.tap((response) =>
            Effect.gen(function*() {
              if (Predicate.isNullable(response)) {
                return
              }

              const session = yield* sessions.findById(sessionId)
              const mailbox = yield* RcMap.get(mailboxes, session.id)
              return yield* mailbox.offer(response)
            })
          ),
          (self) => {
            const annotations = {
              "mcp.method": payload.method,
              "session.id": sessionId
            }

            if (Option.isSome(payload.id)) {
              Object.assign(annotations, {
                "mcp.id": payload.id.value
              })
            }

            if (Option.isSome(payload.params)) {
              Object.assign(annotations, {
                "mcp.params": payload.params.value
              })
            }

            return self.pipe(Effect.annotateLogs(annotations))
          },
          Effect.whenEffect(
            Effect.map(
              sessions.findById(sessionId),
              (session) =>
                ["initialize", "notifications/initialized"].includes(payload.method) ||
                session.activatedAt._tag === "Some"
            )
          )
        )
      ),
      Stream.runDrain,
      Effect.fork
    )

    // Stream messages for a specific session
    const messages = (sessionId: SessionId) =>
      Effect.gen(function*() {
        // Verify session exists
        yield* sessions.findById(sessionId)
        // Get or create mailbox for session
        const mailbox = yield* RcMap.get(mailboxes, sessionId)

        // Create endpoint URL for client publishing
        const endpoint = `/messages?sessionId=${sessionId}`

        // Create initial greeting with endpoint
        const greeting = Stream.make(`event: endpoint\ndata: ${endpoint}\n\n`)

        // Create recurring ping stream every 30 seconds
        const ping = Stream.fromSchedule(Schedule.spaced("30 seconds")).pipe(
          Stream.map(() => {
            const payload = JsonRpcRequest.make({
              jsonrpc: "2.0",
              method: "ping",
              id: Option.none(),
              params: Option.none()
            })

            return `event: message\ndata: ${JSON.stringify(payload)}\n\n`
          }),
          Stream.withSpan("MessageBroker.ping", {
            attributes: { sessionId }
          })
        )

        const messages = Mailbox.toStream(mailbox).pipe(
          Stream.tap((response) =>
            Effect.log("OUTGOING").pipe(
              Effect.annotateLogs({ response })
            )
          ),
          Stream.map((_) => Struct.omit(_ as any, "_tag")),
          Stream.mapEffect((response) => Schema.encodeUnknown(Schema.parseJson(JsonRpcResponse))(response)),
          Stream.map((response) => `event: message\ndata: ${response}\n\n`)
        )

        return greeting.pipe(
          Stream.merge(ping),
          Stream.merge(messages),
          Stream.onDone(() => Effect.succeed("event:done\ndata:finished\n\n")),
          Stream.withSpan("MessageBroker.messages", {
            attributes: { sessionId }
          })
        )
      })

    // Offer a new message to processing
    const offer = (message: Message) =>
      queue.offer(message).pipe(
        Effect.withSpan("MessageBroker.offer", {
          attributes: {
            "mcp.method": message.payload.method,
            "mcp.id": Option.getOrUndefined(message.payload.id),
            "mcp.params": Option.getOrUndefined(message.payload.params)
          }
        })
      )

    return {
      messages,
      offer
    } as const
  })
}) {}
