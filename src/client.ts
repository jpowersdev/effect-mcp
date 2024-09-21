import { HttpApiClient } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { Api } from "./Api.js"

Effect.gen(function*() {
  const client = yield* HttpApiClient.make(Api, {
    baseUrl: "http://localhost:4000"
  })
  const user = yield* client.users.create({
    payload: {
      name: "James"
    }
  })
  console.log(user)
}).pipe(Effect.provide(NodeHttpClient.layerUndici), NodeRuntime.runMain)
