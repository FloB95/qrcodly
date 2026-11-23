import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { AnalyticsIntegrationController } from './http/controller/analytics-integration.controller';
import { ShortUrlAnalyticsController } from './http/controller/short-url-analytics.controller';
import { ScanIpExclusionController } from './http/controller/scan-ip-exclusion.controller';

// Register event handlers
import './event/handler';

const setupAnalyticsModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, AnalyticsIntegrationController, `/analytics-integration`, options);
	registerRoutes(fastify, ShortUrlAnalyticsController, `/short-url`, options);
	registerRoutes(fastify, ScanIpExclusionController, `/scan-ip-exclusion`, options);
	container.resolve(Logger).info('☑️  Analytics module loaded');
	done();
};

export default setupAnalyticsModule;
