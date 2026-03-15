import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';

// modules
import qrCode from './qr-code/setup';
import configTemplate from './config-template/setup';
import urlShortener from './url-shortener/setup';
import customDomain from './custom-domain/setup';
import tag from './tag/setup';
import billing from './billing/setup';
import analyticsIntegration from './analytics-integration/setup';
import userSurvey from './user-survey/setup';

const modules: FastifyPluginCallback = (fastify: FastifyInstance, _options, done) => {
	fastify.register(qrCode);
	fastify.register(configTemplate);
	fastify.register(urlShortener);
	fastify.register(customDomain);
	fastify.register(tag);
	fastify.register(billing);
	fastify.register(analyticsIntegration);
	fastify.register(userSurvey);
	done();
};

export default modules;
