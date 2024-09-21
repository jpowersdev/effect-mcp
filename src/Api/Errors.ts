import { HttpApiSchema } from "@effect/platform"
import { Schema } from "@effect/schema"

export class BadRequest extends Schema.TaggedError<BadRequest>()(
  "BadRequest",
  {
    cause: Schema.Unknown
  },
  HttpApiSchema.annotations({
    status: 400
  })
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({
    status: 401
  })
) {}
