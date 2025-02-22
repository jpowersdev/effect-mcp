import { DevTools } from "@effect/experimental"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Config, Effect, Layer } from "effect"

export const TracingLive = Layer.unwrapEffect(
  Effect.gen(function*() {
    const endpoint = yield* Config.option(
      Config.string("OTEL_EXPORTER_OTLP_ENDPOINT")
    )

    if (endpoint._tag === "None") {
      return DevTools.layer()
    }

    return NodeSdk.layer(() => ({
      resource: {
        serviceName: "service"
      },
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${endpoint.value}/v1/traces` })
      ),
      logRecordProcessor: new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${endpoint.value}/v1/logs` })
      ),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint.value}/v1/metrics` })
      })
    }))
  })
)
