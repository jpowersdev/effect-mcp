import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Config, Effect, Layer } from "effect"

export const TracingLive = Layer.unwrapEffect(
  Effect.gen(function*() {
    const endpoint = yield* Config.option(
      Config.string("OTEL_EXPORTER_OTLP_ENDPOINT")
    )

    if (endpoint._tag === "None") {
      return Layer.empty
    }

    return NodeSdk.layer(() => ({
      resource: {
        serviceName: "service"
      },
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${endpoint.value}/v1/traces` })
      )
    }))
  })
)
