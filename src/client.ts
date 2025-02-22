import { HttpApiClient } from "@effect/platform"
import { NodeHttpClient } from "@effect/platform-node"
import { Config, Effect } from "effect"
import { Api } from "./Api.js"

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  dependencies: [NodeHttpClient.layerUndici],
  scoped: Effect.gen(function*() {
    const port = yield* Config.number("PORT")

    return yield* HttpApiClient.make(Api, {
      baseUrl: `http://localhost:${port}`
    })
  })
}) {}
