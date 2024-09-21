import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

export default Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.onDialectOrElse({
    pg: () =>
      sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `,
    orElse: () =>
      sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `
  })
})
