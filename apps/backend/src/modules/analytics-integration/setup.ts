import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { AnalyticsIntegrationController } from './http/controller/analytics-integration.controller';

// Register event handlers
import './event/handler/scan-tracking.event-handler';

const setupAnalyticsIntegrationModule: FastifyPluginCallback = (
	fastify: FastifyInstance,
	options,
	done,
) => {
	registerRoutes(fastify, AnalyticsIntegrationController, `/analytics-integration`, options);
	container.resolve(Logger).info('☑️  Analytics integration module loaded');
	done();
};

export default setupAnalyticsIntegrationModule;
