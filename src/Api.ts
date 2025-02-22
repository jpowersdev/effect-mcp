import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

const GreetingsApi = HttpApiGroup.make("Greetings").add(
  HttpApiEndpoint.get("hello-world")`/`.addSuccess(Schema.String)
)

// Define our API with one group named "Greetings" and one endpoint called "hello-world"
export const Api = HttpApi.make("MyApi")
  .add(GreetingsApi)
