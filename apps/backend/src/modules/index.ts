import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';

// modules
import storedFile from './stored-file/setup';
import hostedPage from './hosted-page/setup';
import qrCode from './qr-code/setup';
import configTemplate from './config-template/setup';
import urlShortener from './url-shortener/setup';
import customDomain from './custom-domain/setup';
import tag from './tag/setup';
import billing from './billing/setup';
import analytics from './analytics/setup';
import userSurvey from './user-survey/setup';
import apiKey from './api-key/setup';
import integrationUsage from './integration-usage/setup';
import newsletter from './newsletter/setup';
import account from './account/setup';

const modules: FastifyPluginCallback = (fastify: FastifyInstance, _options, done) => {
	fastify.register(storedFile);
	fastify.register(hostedPage);
	fastify.register(qrCode);
	fastify.register(configTemplate);
	fastify.register(urlShortener);
	fastify.register(customDomain);
	fastify.register(tag);
	fastify.register(billing);
	fastify.register(analytics);
	fastify.register(userSurvey);
	fastify.register(apiKey);
	fastify.register(integrationUsage);
	fastify.register(newsletter);
	fastify.register(account);
	done();
};

export default modules;
