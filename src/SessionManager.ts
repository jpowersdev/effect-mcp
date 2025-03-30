import { randomUUID } from "crypto"
import { Context, DateTime, Effect, Layer, Option, Predicate, Schema, TMap } from "effect"

// Type ID for Session domain model
export const TypeId = Symbol.for("Domain/Session")
export type TypeId = typeof TypeId

// Branded type for SessionId
export const SessionId = Schema.String.pipe(Schema.brand("SessionId"))
export type SessionId = Schema.Schema.Type<typeof SessionId>

// Core domain error
export class SessionError extends Schema.TaggedError<SessionError>()("SessionError", {
  message: Schema.String
}) {}

// Core domain model
export interface Session {
  readonly [TypeId]: TypeId
  readonly id: SessionId
  readonly createdAt: DateTime.DateTime
  readonly activatedAt: Option.Option<DateTime.DateTime>

  readonly isActive: () => boolean
  readonly activate: () => Session
}

// Service tag for dependency injection
export class CurrentSession extends Context.Tag("Domain/Session/CurrentSession")<
  CurrentSession,
  Session
>() {
  static layer = (sessionId: SessionId) => Layer.succeed(CurrentSession)(Session.make(sessionId))
}

// Prototype object with shared behavior
const Proto = {
  [TypeId]: TypeId,
  activatedAt: Option.none(),
  isActive(this: Session) {
    return Option.isSome(this.activatedAt)
  },
  activate(this: Session) {
    return makeProto({
      ...this,
      activatedAt: Option.some(DateTime.unsafeNow())
    })
  }
}

// Internal helper for creating Session objects
const makeProto = (options: Partial<Session>): Session =>
  Object.assign(Object.create(Proto), {
    createdAt: options.createdAt ?? DateTime.unsafeNow(),
    ...options
  })

export const Session = {
  /**
   * Create a new session with the given id
   * @since 1.0.0
   * @category Constructors
   */
  make: (id: SessionId): Session => makeProto({ id }),
  /**
   * Create a new session with the given id
   * @since 1.0.0
   * @category Constructors
   */
  makeActive: (id: SessionId): Session => makeProto({ id, activatedAt: Option.some(DateTime.unsafeNow()) }),
  /**
   * Check if a value is a Session
   * @since 1.0.0
   * @category Refinements
   */
  isSession: (u: unknown): u is Session => Predicate.hasProperty(u, TypeId)
}

export class SessionManager extends Effect.Service<SessionManager>()("SessionManager", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const sessions = yield* TMap.make<string, Session>()

    const initialize = Effect.sync(() => {
      const id = SessionId.make(randomUUID())
      return Session.make(id)
    }).pipe(
      Effect.tap((session) => TMap.set(sessions, session.id, session)),
      Effect.withSpan("SessionManager.initialize")
    )

    const findById = (id: string) =>
      TMap.get(sessions, id).pipe(
        Effect.flatMap(Option.match({
          onSome: Effect.succeed,
          onNone: () =>
            new SessionError({
              message: `Session ${id} not found`
            })
        })),
        Effect.withSpan("SessionManager.findById", {
          attributes: { sessionId: id }
        })
      )

    const activateById = (id: string) =>
      findById(id).pipe(
        Effect.map((session) => session.activate()),
        Effect.tap((session) => TMap.set(sessions, id, session)),
        Effect.withSpan("SessionManager.activate", {
          attributes: { sessionId: id }
        })
      )

    const deactivateById = (id: string) =>
      TMap.remove(sessions, id).pipe(
        Effect.withSpan("SessionManager.deactivate", {
          attributes: { sessionId: id }
        })
      )

    return {
      initialize,
      findById,
      activateById,
      deactivateById
    } as const
  })
}) {}
