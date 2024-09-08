import { SqliteClient } from "@effect/sql-sqlite-node"
import { Config, Layer } from "effect"

const config: Config.Config<SqliteClient.SqliteClientConfig> = Config.all({
  filename: Config.succeed("users.db")
})

export const SqlClientLive = SqliteClient.layer(config).pipe(
  Layer.orDie
)
