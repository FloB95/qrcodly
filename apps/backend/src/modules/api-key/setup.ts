import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { ApiKeyController } from './http/controller/api-key.controller';
import './event/handler/user-deleted.event-handler';

const setupApiKeyModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, ApiKeyController, `/api-key`, options);
	container.resolve(Logger).info('☑️  ApiKey module loaded');
	done();
};

export default setupApiKeyModule;
