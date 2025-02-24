import { DateTime, Option, Schema } from "effect"

// Core domain error
export class SessionError extends Schema.TaggedError<SessionError>()("SessionError", {
  message: Schema.String
}) {}

// Core domain model
export interface Session {
  readonly id: string
  readonly createdAt: DateTime.DateTime
  readonly activatedAt: Option.Option<DateTime.DateTime>
}

// Factory and operations
export const Session = {
  make: (id: string): Session => ({
    id,
    createdAt: DateTime.unsafeNow(),
    activatedAt: Option.none()
  }),

  activate: (session: Session): Session => ({
    ...session,
    activatedAt: Option.some(DateTime.unsafeNow())
  }),

  isActive: (session: Session): boolean => Option.isSome(session.activatedAt)
}
