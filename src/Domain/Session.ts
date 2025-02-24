import { Context, DateTime, Option, Schema } from "effect"

// Factory and operations
export const TypeId = Symbol.for("app/Session")
export type TypeId = typeof TypeId

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

export class CurrentSession extends Context.Tag("app/Session/CurrentSession")<
  CurrentSession,
  Session
>() {}

const Proto = {
  [TypeId]: TypeId,
  activatedAt: Option.none(),
  isActive(this: Session) {
    return Option.isSome(this.activatedAt)
  },
  activate(this: Session) {
    console.log("activating session", this.id)
    return makeProto({
      ...this,
      activatedAt: Option.some(DateTime.unsafeNow())
    })
  }
}

const makeProto = (options: Partial<Session>) => Object.assign(Object.create(Proto), options)

/**
 * Create a new session with the given id
 * @since 1.0.0
 * @category Constructors
 */
export const makeSession = (id: SessionId) => makeProto({ id })
