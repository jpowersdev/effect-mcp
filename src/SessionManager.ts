import { randomUUID } from "crypto"
import { Effect, Option, TMap } from "effect"
import type { Session } from "./Domain/Session.js"
import { makeSession, SessionError, SessionId } from "./Domain/Session.js"

export class SessionManager extends Effect.Service<SessionManager>()("SessionManager", {
  dependencies: [],
  scoped: Effect.gen(function*() {
    const sessions = yield* TMap.make<string, Session>()

    const initialize = Effect.sync(() => {
      const id = SessionId.make(randomUUID())
      return makeSession(id)
    }).pipe(
      Effect.tap((session) => TMap.set(sessions, session.id, session)),
      Effect.withSpan("SessionManager.initialize")
    )

    const findById = (id: string) =>
      TMap.get(sessions, id).pipe(
        Effect.map(Option.getOrElse(() => {
          throw new SessionError({
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
