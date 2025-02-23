#!/usr/bin/env sh
mkdir -p tmp
curl https://raw.githubusercontent.com/modelcontextprotocol/specification/refs/heads/main/schema/2024-11-05/schema.json > tmp/jsonschema.json
pnpm jsonschema-gen --spec tmp/jsonschema.json --output src/Generated.ts --reservedPrefix Mcp
rm -rf tmp
