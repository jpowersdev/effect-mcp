import { Duration, Effect, Either, Mailbox as Mailbox_, Option, PubSub, Queue, RcMap, Schema, Stream } from "effect"
import type { JsonRpcRequest, JsonRpcSuccess } from "./Domain/JsonRpc.js"
import { JsonRpcFailure, JsonRpcResponse } from "./Domain/JsonRpc.js"
import { CurrentSession } from "./Session.js"
import { Transport } from "./Transport.js"

export class Mailbox extends Effect.Service<Mailbox>()("@jpowersdev/effect-mcp/Mailbox", {
  dependencies: [Transport.Default],
  scoped: Effect.gen(function*() {
    const inbox = yield* Queue.bounded<JsonRpcRequest>(100)
    const outbox = yield* PubSub.bounded<JsonRpcResponse>(100)

    const sessions = yield* RcMap.make({
      lookup: () => Mailbox_.make<JsonRpcResponse>(),
      idleTimeToLive: Duration.minutes(1)
    })

    const transport = yield* Transport

    const encode = Schema.encodeUnknown(Schema.parseJson(JsonRpcResponse))

    yield* Stream.fromQueue(inbox).pipe(
      Stream.tap((message) =>
        Effect.log(`${message.method} (${message.id})`).pipe(
          Effect.annotateLogs({
            "mcp.method": message.method,
            "mcp.id": message.id,
            "mcp.params": Option.getOrUndefined(message.params)
          })
        )
      ),
      Stream.mapEffect((message) =>
        transport.handle(message).pipe(
          Effect.catchAllCause((cause) =>
            Effect.succeed(
              JsonRpcFailure.make({
                id: message.id,
                jsonrpc: "2.0",
                error: cause
              })
            )
          ),
          Effect.either,
          Effect.flatMap(
            Either.match({
              onLeft: (error) =>
                Effect.logError(error).pipe(
                  Effect.andThen(() => outbox.publish(error as JsonRpcFailure))
                ),
              onRight: (response) => outbox.publish(response as JsonRpcSuccess)
            })
          )
        )
      ),
      Stream.runDrain,
      Effect.fork
    )

    const messages = (sessionId: string) =>
      Stream.fromPubSub(outbox).pipe(
        Stream.filterEffect(() =>
          Effect.gen(function*() {
            const session = yield* CurrentSession
            return session.id === sessionId
          })
        ),
        Stream.tap((message) => Effect.log("outgoing").pipe(Effect.annotateLogs({ message }))),
        Stream.mapEffect(encode),
        Stream.map((data) => `data:${data}\n\n`),
        Stream.concat(Stream.make("event:done\ndata:finished\n\n")),
        Stream.onStart(Effect.log("streaming...")),
        Stream.onEnd(Effect.log("done")),
        Stream.withSpan("Mailbox.messages")
      )

    const offer = (message: JsonRpcRequest) =>
      inbox.offer(message).pipe(
        Effect.withSpan("Mailbox.offer", {
          attributes: {
            "rpc.method": message.method,
            "rpc.id": message.id,
            "rpc.params": Option.getOrUndefined(message.params)
          }
        })
      )

    return {
      offer,
      messages
    }
  })
}) {}
