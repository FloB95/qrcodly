import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { HostMetrics } from '@opentelemetry/host-metrics';

const metricsDataset = process.env.OTEL_METRICS_DATASET;
const tracesDataset = process.env.OTEL_TRACES_DATASET;
const metricsEnabled = !!metricsDataset;
const tracesEnabled = !!tracesDataset;

let sdk: NodeSDK | undefined;

if (metricsEnabled || tracesEnabled) {
	const axiomToken = process.env.AXIOM_TOKEN;

	if (!axiomToken) {
		console.warn('[OTel] AXIOM_TOKEN not set — skipping OpenTelemetry initialization');
	} else {
		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: 'qrcodly-backend',
			[ATTR_SERVICE_VERSION]: '1.0.0',
			'deployment.environment.name': process.env.NODE_ENV || 'development',
		});

		const metricReader = metricsEnabled
			? new PeriodicExportingMetricReader({
					exporter: new OTLPMetricExporter({
						url: 'https://api.axiom.co/v1/metrics',
						headers: {
							Authorization: `Bearer ${axiomToken}`,
							'X-Axiom-Dataset': metricsDataset,
						},
					}),
					exportIntervalMillis: Number(process.env.OTEL_METRICS_INTERVAL_MS) || 60000,
				})
			: undefined;

		const traceExporter = tracesEnabled
			? new OTLPTraceExporter({
					url: 'https://api.axiom.co/v1/traces',
					headers: {
						Authorization: `Bearer ${axiomToken}`,
						'X-Axiom-Dataset': tracesDataset,
					},
				})
			: undefined;

		const fastifyOtel = new FastifyOtelInstrumentation();

		const instrumentations = tracesEnabled ? [new HttpInstrumentation(), fastifyOtel] : [];

		sdk = new NodeSDK({
			resource,
			...(metricReader ? { metricReader } : {}),
			...(traceExporter ? { traceExporter } : {}),
			instrumentations,
		});

		sdk.start();

		if (metricsEnabled) {
			const hostMetrics = new HostMetrics({});
			hostMetrics.start();
		}

		const enabledFeatures = [
			metricsEnabled ? `metrics → ${metricsDataset}` : null,
			tracesEnabled ? `traces → ${tracesDataset}` : null,
		]
			.filter(Boolean)
			.join(', ');
		console.log(`[OTel] Initialized (${enabledFeatures})`);
	}
}

export async function shutdownOtel(): Promise<void> {
	if (sdk) {
		try {
			await sdk.shutdown();
			console.log('[OTel] Shutdown complete');
		} catch (error) {
			console.error('[OTel] Shutdown error:', error);
		}
	}
}
