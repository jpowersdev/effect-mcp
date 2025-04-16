/**
 * @since 1.0.0
 */
import { Headers, HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema, Scope, Stream } from "effect"
import { JsonRpcRequest } from "./JsonRpc.js"
import { MessageBroker } from "./MessageBroker.js"
import { CurrentSession, SessionId, SessionManager } from "./SessionManager.js"

/**
 * @since 1.0.0
 * @category layers
 */
export class SseTransport extends Effect.Service<SseTransport>()("SseTransport", {
  dependencies: [
    MessageBroker.Default,
    SessionManager.Default
  ],
  scoped: Effect.gen(function*() {
    const broker = yield* MessageBroker
    const sessions = yield* SessionManager

    return HttpRouter.empty.pipe(
      HttpRouter.get(
        "/messages",
        Effect.gen(function*() {
          const session = yield* sessions.initialize
          const messageStream = yield* broker.messages(session.id)
          const scope = yield* Effect.scope

          const stream = messageStream.pipe(
            Stream.provideService(Scope.Scope, scope)
          )

          return HttpServerResponse.stream(Stream.encodeText(stream), {
            headers: Headers.fromInput({
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            })
          })
        })
      ),
      HttpRouter.post(
        "/messages",
        Effect.gen(function*() {
          const { sessionId } = yield* HttpServerRequest.schemaSearchParams(
            Schema.Struct({
              sessionId: SessionId
            })
          )

          const payload = yield* HttpServerRequest.schemaBodyJson(JsonRpcRequest)

          yield* Effect.annotateCurrentSpan({
            "session.id": sessionId,
            payload
          })

          yield* Effect.log("Received message via POST", {
            sessionId,
            method: payload.method
          })

          const result = yield* broker.offer({ payload, sessionId }).pipe(
            Effect.provideServiceEffect(
              CurrentSession,
              sessions.findById(sessionId)
            )
          )

          return HttpServerResponse.raw(result)
        }).pipe(
          Effect.catchTag("SessionError", (e) => HttpServerResponse.json(e, { status: 404 }))
        )
      )
    )
  })
}) {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = SseTransport.Default
