import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';

// Register event handlers
import './event/handler/user-deleted.event-handler';

const setupIntegrationUsageModule: FastifyPluginCallback = (
	_fastify: FastifyInstance,
	_options,
	done,
) => {
	container.resolve(Logger).info('☑️  Integration usage module loaded');
	done();
};

export default setupIntegrationUsageModule;
