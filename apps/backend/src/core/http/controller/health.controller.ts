import { Get } from '@/core/decorators/route';
import AbstractController from './abstract.controller';
import { injectable } from 'tsyringe';

@injectable()
export class HealthController extends AbstractController {
	@Get('', { schema: { hide: true }, authHandler: false })
	healthCheck() {
		return this.makeApiHttpResponse(200, { status: 'ok' });
	}
}
