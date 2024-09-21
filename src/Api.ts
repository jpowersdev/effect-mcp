import { HttpApi } from "@effect/platform"
import { BadRequest, Unauthorized } from "./Api/Errors.js"
import { UsersApi } from "./Users/Api.js"

export const Api = HttpApi.empty.pipe(
  HttpApi.addGroup(UsersApi),
  HttpApi.addError(Unauthorized),
  HttpApi.addError(BadRequest)
)
