import { NodeTerminal } from "@effect/platform-node"
import * as Terminal from "@effect/platform/Terminal"
import { Fiber, Layer, Logger, Stream } from "effect"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { JsonRpcRequest } from "./JsonRpc.js"
import { McpProtocolAdapter } from "./McpProtocolAdapter.js"
import { MessageBroker } from "./MessageBroker.js"
import { CurrentSession, SessionManager } from "./SessionManager.js"

/**
 * Outputs logs to stderr to avoid corrupting the stdout stream.
 */
export const StdioLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.prettyLogger({
    stderr: true,
    colors: true,
    mode: "tty"
  })
)

export class StdioTransport extends Effect.Service<StdioTransport>()("StdioTransport", {
  accessors: true,
  dependencies: [
    McpProtocolAdapter.Default,
    MessageBroker.Default,
    SessionManager.Default,
    NodeTerminal.layer
  ],
  scoped: Effect.gen(function*() {
    const broker = yield* MessageBroker
    const sessions = yield* SessionManager
    const terminal = yield* Terminal.Terminal

    return {
      run: Effect.gen(function*() {
        // Initialize a new session
        const session = yield* sessions.initialize

        const decode = Schema.decode(Schema.parseJson(JsonRpcRequest))

        // Send output to terminal
        const outputFiber = yield* broker.messagesById(session.id).pipe(
          Stream.tap((message) => terminal.display(message + "\n")),
          Stream.runDrain,
          Effect.fork
        )

        // Read input from terminal
        yield* Stream.repeatEffect(terminal.readLine).pipe(
          Stream.mapEffect(decode),
          Stream.tap((payload) =>
            broker.offer({
              sessionId: session.id,
              payload
            }).pipe(
              Effect.provideService(
                CurrentSession,
                session
              )
            )
          ),
          Stream.runDrain,
          Effect.fork
        )

        yield* Fiber.join(outputFiber)
      })
    }
  })
}) {
  static WithLogger = Layer.provideMerge(StdioTransport.Default, StdioLogger)
}
