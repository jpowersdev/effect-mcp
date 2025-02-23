import { DateTime, Effect, Either, Option, PubSub, Queue, Schedule, Schema, Stream } from "effect"
import type { JsonRpcFailure, JsonRpcSuccess } from "./Domain/JsonRpc.js"
import { JsonRpcRequest, JsonRpcResponse } from "./Domain/JsonRpc.js"
import { Transport } from "./Transport.js"

const keepAlive = Stream.fromSchedule(Schedule.spaced("1 second")).pipe(
  Stream.map(() =>
    JsonRpcRequest.make({
      id: DateTime.unsafeNow().pipe(DateTime.toEpochMillis, String),
      method: "ping",
      params: Option.none()
    })
  ),
  Stream.mapEffect(Schema.encode(Schema.parseJson(JsonRpcRequest))),
  Stream.map((data) => `data:${data}\n\n`)
)

export class Mailbox extends Effect.Service<Mailbox>()("@jpowersdev/effect-mcp/Mailbox", {
  dependencies: [Transport.Default],
  scoped: Effect.gen(function*() {
    const inbox = yield* Queue.bounded<JsonRpcRequest>(100)
    const outbox = yield* PubSub.bounded<JsonRpcResponse>(100)
    const transport = yield* Transport

    const encode = Schema.encodeUnknown(Schema.parseJson(JsonRpcResponse))

    yield* Stream.fromQueue(inbox).pipe(
      Stream.tap((message) =>
        Effect.log("incoming").pipe(
          Effect.annotateLogs({ message })
        )
      ),
      Stream.tapError((error) => Effect.logError(error)),
      Stream.tap((message) =>
        Effect.log("decoded").pipe(
          Effect.annotateLogs({ message })
        )
      ),
      Stream.mapEffect((a) => Effect.either(transport.handle(a as any))),
      Stream.tap((message) =>
        Effect.log("handled").pipe(
          Effect.annotateLogs({ message })
        )
      ),
      Stream.mapEffect(Either.match({
        onLeft: (error) =>
          Effect.logError(error).pipe(
            Effect.andThen(() => outbox.publish(error as JsonRpcFailure))
          ),
        onRight: (response) => outbox.publish(response as JsonRpcSuccess)
      })),
      Stream.runDrain,
      Effect.fork
    )

    const messages = Stream.fromPubSub(outbox).pipe(
      Stream.tap((message) => Effect.log("outgoing").pipe(Effect.annotateLogs({ message }))),
      Stream.mapEffect(encode),
      Stream.map((data) => `data:${data}\n\n`),
      Stream.merge(keepAlive),
      Stream.concat(Stream.make("event:done\ndata:finished\n\n")),
      Stream.encodeText,
      Stream.onStart(Effect.log("streaming...")),
      Stream.onEnd(Effect.log("done")),
      Stream.withSpan("Mailbox.messages")
    )

    const offer = (message: JsonRpcRequest) =>
      inbox.offer(message).pipe(
        Effect.withSpan("Mailbox.offer", {
          attributes: { message }
        })
      )

    return {
      offer,
      messages
    }
  })
}) {}
