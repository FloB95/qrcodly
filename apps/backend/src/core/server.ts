import { inject, singleton } from 'tsyringe';
import { Logger } from './logging';
import {
	API_BASE_PATH,
	FASTIFY_LOGGING,
	IN_DEVELOPMENT,
	IN_TEST,
	RATE_LIMIT_MAX,
	RATE_LIMIT_TIME_WINDOW,
} from './config/constants';
import fastify, { FastifyListenOptions, type FastifyInstance } from 'fastify';
import { clerkPlugin } from '@clerk/fastify';
import { fastifyErrorHandler, registerRoutes } from '@/libs/fastify/helpers';
import { env } from './config/env';
import fastifyHelmet from '@fastify/helmet';
import { TooManyRequestsError } from './error/http/too-many-requests.error';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import { OnShutdown } from './decorators/on-shutdown.decorator';
import { HealthController } from './http/controller/health.controller';
import FastifySwagger from '@fastify/swagger';

@singleton()
export class Server {
	readonly server: FastifyInstance;

	constructor(@inject(Logger) private readonly logger: Logger) {
		this.server = fastify({
			logger: FASTIFY_LOGGING,
		});
	}

	async build() {
		await this.server.register(FastifySwagger, {
			openapi: {
				openapi: '3.0.0',
				info: {
					title: 'My Fastify App',
					version: '1.0.0',
				},
				servers: [
					{
						url: `${env.BACKEND_URL}/api/v1`,
						description: 'API v1',
					},
				],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							bearerFormat: 'API_KEY',
							description: 'Enter your API key to access this API',
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

		// catch all errors
		this.setupErrorHandlers();

		// disable build in validation and use custom validation
		this.server.setValidatorCompiler(() => {
			return () => ({});
		});

		this.server.setSerializerCompiler(function () {
			return function (data) {
				return JSON.stringify(data);
			};
		});

		// register security modules
		await this.server.register(fastifyCors, {
			allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
			credentials: true,
			methods: ['GET', 'POST', 'DELETE', 'PATCH'],
			origin: true,
		});

		// register authentication provider
		await this.server.register(clerkPlugin, {
			secretKey: env.CLERK_SECRET_KEY,
			publishableKey: env.CLERK_PUBLISHABLE_KEY,
			telemetry: {
				disabled: true,
			},
		});

		// register cookie
		await this.server.register(fastifyCookie, {
			secret: env.COOKIE_SECRET,
		});

		// register rate limit
		if (!IN_TEST && !IN_DEVELOPMENT) {
			await this.server.register(fastifyRateLimit, {
				max: RATE_LIMIT_MAX, // max requests per window
				timeWindow: RATE_LIMIT_TIME_WINDOW,
				// allowList: ['127.0.0.1'], // default []
				nameSpace: 'qrcodly-ratelimit-', // default is 'fastify-rate-limit-'
				errorResponseBuilder: function () {
					throw new TooManyRequestsError();
				},
			});
		}

		// register security modules
		await this.server.register(fastifyHelmet);

		// register health check endpoint
		registerRoutes(this.server, HealthController, API_BASE_PATH);

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

		// register api modules
		const modules = await import('@/modules');
		await this.server.register(modules.default, { prefix: API_BASE_PATH });

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
		// register error handler
		this.server.setErrorHandler(fastifyErrorHandler);
	}

	@OnShutdown()
	async onShutdown(): Promise<void> {
		this.logger.debug(`Shutting down server`);
		try {
			await this.server.close();
		} catch (error) {
			this.logger.error('Error shutting down server', { error });
		}
	}
}
