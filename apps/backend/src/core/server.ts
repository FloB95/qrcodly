import { container, inject, singleton } from 'tsyringe';
import { Logger } from './logging';
import {
	API_BASE_PATH,
	FASTIFY_LOGGING,
	IN_TEST,
	RATE_LIMIT_TIME_WINDOW,
	UPLOAD_LIMIT,
} from './config/constants';
import fastify, { FastifyListenOptions, type FastifyInstance } from 'fastify';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import {
	createRequestLogObject,
	fastifyErrorHandler,
	registerRoutes,
	resolveClientIp,
} from '@/libs/fastify/helpers';
import { addUserToRequestMiddleware } from '@/core/http/middleware/add-user-to-request.middleware';
import { env } from './config/env';
import fastifyHelmet from '@fastify/helmet';
import { TooManyRequestsError } from './error/http/too-many-requests.error';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import { OnShutdown } from './decorators/on-shutdown.decorator';
import { HealthController } from './http/controller/health.controller';
import FastifySwagger from '@fastify/swagger';
import { ClerkWebhookController } from './http/controller/clerk.webhook.controller';
import { StripeWebhookController } from '@/modules/billing/http/controller/stripe-webhook.controller';
import multipart from '@fastify/multipart';
import { resolveRateLimit } from './rate-limit/rate-limit.resolver';
import { RateLimitPolicy } from './rate-limit/rate-limit.policy';
import { KeyCache } from './cache';
import { IpAbuseTrackerService } from './ip-protection';
import {
	httpRequestDuration,
	httpRequestsTotal,
	httpErrorsTotal,
	httpActiveRequests,
	rateLimitHits,
	registerActiveSessionsGauge,
} from './metrics';

@singleton()
export class Server {
	readonly server: FastifyInstance;

	constructor(@inject(Logger) private readonly logger: Logger) {
		this.server = fastify({
			logger: FASTIFY_LOGGING,
			bodyLimit: 3 * 1024 * 1024, // 3 MB
		});
	}

	async build() {
		// OTel request metrics hooks
		this.server.addHook('onRequest', (request, _reply, done) => {
			request.startTime = process.hrtime.bigint();
			httpActiveRequests.add(1);
			done();
		});

		this.server.addHook('onResponse', (request, reply, done) => {
			if (request.startTime) {
				const durationMs = Number(process.hrtime.bigint() - request.startTime) / 1e6;
				const attrs = {
					'http.method': request.method,
					'http.route': request.routeOptions?.url || request.url,
					'http.status_code': reply.statusCode,
				};
				httpRequestDuration.record(durationMs, attrs);
				httpRequestsTotal.add(1, attrs);
				httpActiveRequests.add(-1);
				if (reply.statusCode >= 400) {
					httpErrorsTotal.add(1, attrs);
				}
			}
			done();
		});

		await this.server.register(FastifySwagger, {
			openapi: {
				openapi: '3.0.0',
				info: {
					title: 'QRcodly API',
					version: '1.0.0',
					description:
						'The QRcodly REST API lets you create, manage, and track QR codes and short URLs programmatically. ' +
						'Features include dynamic QR codes with editable destinations, customizable styling, ' +
						'bulk CSV import, URL shortening with click analytics, tagging, shareable public links, and design templates. ' +
						'All endpoints require Bearer token authentication unless marked as public.',
					contact: {
						name: 'QRcodly Support',
						url: 'https://qrcodly.com',
					},
				},
				servers: [
					{
						url: `${env.BACKEND_URL}/api/v1`,
						description: 'API v1',
					},
				],
				tags: [
					{
						name: 'QR Codes',
						description:
							'Create, read, update, and delete QR codes. Supports 8 content types: URL, Text, WiFi, vCard, Email, Location, Event, and EPC (SEPA payment). Dynamic QR codes (URL type with isDynamic=true) automatically generate a linked short URL so the destination can be changed after printing.',
					},
					{
						name: 'QR Code Sharing',
						description:
							'Manage shareable public links for QR codes. Create a share link to let anyone view and optionally download a QR code without authentication.',
					},
					{
						name: 'Short URLs',
						description:
							'Create and manage standalone short URLs (not linked to QR codes). Each short URL gets a unique 5-character code and supports click analytics, custom domains, and active/inactive toggling.',
					},
					{
						name: 'Analytics',
						description:
							'Retrieve click analytics for short URLs including pageviews, visitor counts, browser/OS/device/country breakdowns, and time-series data.',
					},
					{
						name: 'Tags',
						description:
							'Organize QR codes and short URLs with colored tags. Tags can be assigned to both QR codes and short URLs for filtering and grouping.',
					},
					{
						name: 'Templates',
						description:
							'Save and reuse QR code styling configurations as templates. Includes predefined templates available to all users and custom user-created templates.',
					},
					{
						name: 'Public',
						description: 'Publicly accessible endpoints that do not require authentication.',
					},
				],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							bearerFormat: 'API_KEY',
							description:
								'Authenticate with a Bearer token. Pass your API key in the Authorization header: `Authorization: Bearer <your-api-key>`',
						},
					},
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
		});

		this.setupErrorHandlers();

		this.server.setValidatorCompiler(() => {
			return () => ({});
		});

		this.server.setSerializerCompiler(function () {
			return function (data) {
				return JSON.stringify(data);
			};
		});

		await this.server.register(multipart, {
			attachFieldsToBody: true,
			limits: {
				fileSize: UPLOAD_LIMIT,
			},
		});

		await this.server.register(fastifyCors, {
			allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
			origin: true,
		});

		await this.server.register(clerkPlugin, {
			secretKey: env.CLERK_SECRET_KEY,
			publishableKey: env.CLERK_PUBLISHABLE_KEY,
			telemetry: {
				disabled: true,
			},
		});

		await this.server.register(fastifyCookie, {
			secret: env.COOKIE_SECRET,
		});

		// Add middleware to attach user info to request before all handlers
		this.server.addHook('preHandler', addUserToRequestMiddleware);

		if (!IN_TEST && env.DISABLE_RATE_LIMITING !== true) {
			await this.server.register(fastifyRateLimit, {
				hook: 'preHandler',
				keyGenerator: (request) => {
					const { userId } = getAuth(request, {
						acceptsToken: ['session_token', 'api_key'],
					}) as { userId: string | null };

					const policy = request.routeOptions.config?.rateLimitPolicy ?? RateLimitPolicy.DEFAULT;
					const userKey = userId ? `user:${userId}` : `anon:${request.clientIp}`;
					return `${userKey}:${policy}`;
				},
				max: (request) => {
					const policy = request.routeOptions.config?.rateLimitPolicy ?? RateLimitPolicy.DEFAULT;
					return resolveRateLimit(request, policy);
				},
				redis: container.resolve(KeyCache).getClient(),
				timeWindow: RATE_LIMIT_TIME_WINDOW,
				nameSpace: 'qrcodly-ratelimit-',
				errorResponseBuilder: function (req, context) {
					container.resolve(Logger).warn('request.rate.limit.hit', {
						request: createRequestLogObject(req, { rateLimit: context.max }),
					});
					rateLimitHits.add(1);
					throw new TooManyRequestsError();
				},
			});
		} else {
			this.logger.warn(
				'Rate limiting is disabled. This should not be used in production environments.',
			);
		}

		this.server.addContentTypeParser('*', function (request, payload, done) {
			let data = '';
			payload.on('data', (chunk) => {
				data += chunk;
			});
			payload.on('end', () => {
				done(null, data);
			});
		});

		this.server.addHook('onRequest', (request, reply, done) => {
			request.clientIp = resolveClientIp(request);
			done();
		});

		this.server.addHook('onRequest', async (request, reply) => {
			const blocked = await container.resolve(IpAbuseTrackerService).isBlocked(request.clientIp);

			if (blocked) {
				return reply.status(403).send({ message: 'Access denied', code: 403 });
			}
		});

		await this.server.register(fastifyHelmet);

		registerRoutes(this.server, HealthController, API_BASE_PATH);
		registerRoutes(this.server, ClerkWebhookController, API_BASE_PATH);

		// Stripe webhook needs the raw request body (string) for HMAC signature
		// verification. Register it in an encapsulated scope that overrides the
		// built-in JSON parser so the body stays as a raw string.
		await this.server.register((instance) => {
			instance.removeAllContentTypeParsers();
			instance.addContentTypeParser(
				'application/json',
				{ parseAs: 'string' },
				(_req, body, done) => {
					done(null, body);
				},
			);
			registerRoutes(instance, StripeWebhookController, API_BASE_PATH);
		});

		this.server.get('/robots.txt', { schema: { hide: true } }, async (request, reply) => {
			return reply.type('text/plain').send('User-agent: *\nDisallow: /\n');
		});

		this.server.get(
			`${API_BASE_PATH}/openapi.json`,
			{
				schema: {
					hide: true,
				},
			},
			async (request, reply) => {
				const openapiSchema = await this.server.swagger();
				return reply.send(openapiSchema);
			},
		);

		const modules = await import('@/modules');
		await this.server.register(modules.default, { prefix: API_BASE_PATH });

		// Register active sessions gauge (needs Redis client)
		registerActiveSessionsGauge(container.resolve(KeyCache).getClient());

		return this;
	}

	async start() {
		try {
			await this.build();
			await this.server.ready();

			const serverOptions: FastifyListenOptions = {
				port: Number(process.env.PORT || env.API_PORT),
				host: env.API_HOST,
			};

			await this.server.listen(serverOptions);

			this.logger.info(
				`🚀 API Server is running under url http://${serverOptions.host}:${serverOptions.port}`,
			);
			return this.server;
		} catch (e) {
			console.error(e);
		}

		return this;
	}

	private setupErrorHandlers() {
		this.server.setErrorHandler(fastifyErrorHandler);
	}

	@OnShutdown()
	async onShutdown(): Promise<void> {
		this.logger.debug(`Shutting down server`);
		try {
			await this.server.close();
		} catch (error) {
			this.logger.error('Error shutting down server', { error: error as Error });
		}
	}
}
