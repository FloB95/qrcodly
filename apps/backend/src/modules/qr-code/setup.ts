import { container } from 'tsyringe';

// other imports
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { QrCodeController } from './http/controller/qr-code.controller';
import {
	QrCodeShareController,
	PublicQrCodeShareController,
} from './http/controller/qr-code-share.controller';

// Register Event Handlers
import './event/handler';

const setupQrCodeModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, QrCodeController, `/qr-code`, options);
	registerRoutes(fastify, QrCodeShareController, `/qr-code`, options);
	registerRoutes(fastify, PublicQrCodeShareController, `/s`, options);
	container.resolve(Logger).info('☑️  QR Code module loaded');
	done();
};

export default setupQrCodeModule;
