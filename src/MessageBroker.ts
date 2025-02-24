import { Deferred, Duration, Effect, Mailbox, Option, Queue, RcMap, Schedule, Stream } from "effect"
import type { SessionId } from "./Domain/Session.js"
import { SessionManager } from "./SessionManager.js"
import type { JsonRpcRequest, JsonRpcResponse } from "./Transport.js"
import { Transport } from "./Transport.js"

export interface Message {
  readonly sessionId: SessionId
  readonly payload: JsonRpcRequest
}

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
      Stream.tap(({ payload: message }) =>
        Effect.log(`Processing ${message.method} (${Option.getOrUndefined(message.id)})`).pipe(
          Effect.annotateLogs({
            "mcp.method": message.method,
            "mcp.id": Option.getOrUndefined(message.id),
            "mcp.params": Option.getOrUndefined(message.params)
          })
        )
      ),
      Stream.mapEffect(({ payload: message, sessionId }) =>
        transport.handle(message).pipe(
          Effect.catchAllCause((cause) =>
            Effect.logError(cause).pipe(
              Effect.map(() => ({
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: "Internal server error"
                }
              } as JsonRpcResponse))
            )
          ),
          Effect.tap((response) =>
            Effect.gen(function*() {
              const session = yield* sessions.findById(sessionId)
              const mailbox = yield* RcMap.get(mailboxes, session.id)
              yield* mailbox.offer(response)
            })
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
        const endpoint = `http://localhost:3000/messages?sessionId=${sessionId}`

        // Create initial greeting with endpoint
        const greeting = Stream.make(`event: endpoint\ndata: ${endpoint}\n\n`)

        // Create recurring ping stream every 30 seconds
        const ping = Stream.repeatEffect(
          Effect.succeed(`event:message\ndata:${
            JSON.stringify({
              jsonrpc: "2.0",
              method: "ping"
            })
          }\n\n`)
        ).pipe(Stream.schedule(Schedule.spaced(Duration.seconds(30))))

        const isActive = sessions.findById(sessionId).pipe(
          Effect.option,
          Effect.map(Option.match({
            onSome: (session) => session.isActive,
            onNone: () => false
          }))
        )

        const latch = yield* Deferred.make<void>()

        yield* isActive.pipe(
          Effect.if({
            onTrue: () => Deferred.succeed(latch, void 0),
            onFalse: () => Effect.void
          }),
          Effect.repeat({
            schedule: Schedule.spaced(Duration.seconds(1)),
            while: () => Effect.negate(Deferred.isDone(latch))
          })
        )

        const messages = Stream.fromEffect(Deferred.await(latch)).pipe(
          Stream.zipRight(Mailbox.toStream(mailbox)),
          Stream.map((response) => `data:${JSON.stringify(response)}\n\n`)
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
