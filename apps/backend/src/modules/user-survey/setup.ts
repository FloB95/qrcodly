import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { UserSurveyController } from './http/controller/user-survey.controller';
import './event/handler/user-deleted.event-handler';

const setupUserSurveyModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, UserSurveyController, `/user-survey`, options);
	container.resolve(Logger).info('☑️  User Survey module loaded');
	done();
};

export default setupUserSurveyModule;
