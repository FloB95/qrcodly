import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { AccountDeletionRequestController } from './http/controller/account-deletion-request.controller';

const setupAccountModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, AccountDeletionRequestController, `/account/deletion-request`, options);
	container.resolve(Logger).info('☑️  Account module loaded');
	done();
};

export default setupAccountModule;
