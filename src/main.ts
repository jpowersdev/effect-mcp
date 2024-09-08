import { NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { HttpLive } from "./HttpApi.js"

// run the server
Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
