import { randomUUID } from "crypto"
import { Context, DateTime, Deferred, Effect, Option, Predicate, Schedule, Schema, STM, Stream, TMap } from "effect"
import { JsonRpcRequest } from "./Domain/JsonRpc.js"
import { Mailbox } from "./Mailbox.js"

const TypeId: unique symbol = Symbol.for("app/Session")

type TypeId = typeof TypeId

export const isSession = (u: unknown): u is Session => Predicate.hasProperty(u, TypeId)

export interface Session {
  readonly [TypeId]: TypeId
  readonly id: string
  readonly createdAt: DateTime.DateTime
  readonly activatedAt: Option.Option<DateTime.DateTime>
}

const Proto = {
  [TypeId]: TypeId
}

const makeSession = (id: string = randomUUID()): Session =>
  Object.assign(Object.create(Proto), {
    id,
    createdAt: DateTime.unsafeNow(),
    activatedAt: Option.none()
  })

export class CurrentSession extends Context.Tag("CurrentSession")<
  CurrentSession,
  Session
>() {}

export class SessionNotFoundError extends Schema.TaggedError<SessionNotFoundError>()("SessionNotFoundError", {
  cause: Schema.Unknown,
  message: Schema.String
}) {}

const keepAlive = Stream.fromSchedule(Schedule.spaced("1 second")).pipe(
  Stream.mapEffect(() =>
    Effect.gen(function*() {
      const sessionId = yield* CurrentSession.pipe(Effect.map((_) => _.id))
      return JsonRpcRequest.make({
        id: Option.some(DateTime.unsafeNow().pipe(DateTime.toEpochMillis, String)),
        method: "ping",
        params: Option.none(),
        sessionId
      })
    })
  ),
  Stream.mapEffect(Schema.encode(Schema.parseJson(JsonRpcRequest))),
  Stream.map((data) => `event: message\ndata:${data}\n\n`)
)

const greeting = Stream.fromEffect(
  Effect.map(CurrentSession, (session) => `http://localhost:3000/messages?sessionId=${session.id}`)
).pipe(
  Stream.map((endpoint) => `event: endpoint\ndata: ${encodeURI(endpoint)}\n\n`)
)

export class Sessions extends Effect.Service<Sessions>()("Sessions", {
  dependencies: [Mailbox.Default],
  scoped: Effect.gen(function*() {
    const mailbox = yield* Mailbox
    const sessions = yield* TMap.make<string, Session>()

    const initialize = STM.sync(() => makeSession()).pipe(
      STM.tap((session) => TMap.set(sessions, session.id, session)),
      STM.commit,
      Effect.withSpan("Sessions.make")
    )

    const activateById = (sessionId: string) =>
      TMap.get(sessions, sessionId).pipe(
        STM.flatMap((_) =>
          Option.match(_, {
            onSome: (session) =>
              TMap.set(sessions, sessionId, {
                ...session,
                activatedAt: Option.some(DateTime.unsafeNow())
              }),
            onNone: () =>
              STM.fail(
                new SessionNotFoundError({
                  cause: new Error("Session not found"),
                  message: `Session ${sessionId} not found`
                })
              )
          })
        ),
        STM.commit,
        Effect.withSpan("Sessions.activate", {
          attributes: { sessionId }
        })
      )

    const deactivateById = (id: string) =>
      TMap.remove(sessions, id).pipe(
        STM.commit,
        Effect.withSpan("Sessions.deactivate", {
          attributes: { sessionId: id }
        })
      )

    const findById = (id: string) =>
      TMap.get(sessions, id).pipe(
        STM.commit,
        Effect.flatMap(Option.match({
          onSome: Effect.succeed,
          onNone: () =>
            new SessionNotFoundError({
              cause: new Error("Session not found"),
              message: `Session ${id} not found`
            })
        }))
      )

    const begin = Stream.unwrap(Effect.gen(function*() {
      const session = yield* initialize
      const active = yield* Deferred.make<void>()

      const isInactive = Effect.negate(Deferred.isDone(active))

      yield* findById(session.id).pipe(
        Effect.retry({
          while: () => isInactive,
          schedule: Schedule.spaced("1 second")
        }),
        Effect.fork
      )

      const messages = Stream.repeatEffect(Deferred.await(active)).pipe(
        Stream.zipRight(mailbox.messages(session.id))
      )

      return greeting.pipe(
        Stream.merge(keepAlive),
        Stream.merge(messages),
        Stream.onDone(() => deactivateById(session.id)),
        Stream.onDone(() => Effect.succeed("event: done\ndata: finished\n\n")),
        Stream.provideService(CurrentSession, session),
        Stream.withSpan("Sessions.begin")
      )
    }))

    return {
      begin,
      activateById,
      findById
    } as const
  })
}) {}
