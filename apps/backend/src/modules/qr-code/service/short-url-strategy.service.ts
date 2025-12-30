import { injectable } from 'tsyringe';
import { IShortUrlStrategy } from './short-url-strategies/short-url-strategy.interface';
import { TQrCode } from '@shared/schemas';
import { UrlStrategy } from './short-url-strategies/url.strategy';
import { EventUrlStrategy } from './short-url-strategies/event.strategy';

@injectable()
export class ShortUrlStrategyService {
	private strategies: IShortUrlStrategy[];

	constructor() {
		this.strategies = [new UrlStrategy(), new EventUrlStrategy()];
	}

	async handle(qrCode: TQrCode) {
		for (const strategy of this.strategies) {
			if (strategy.appliesTo(qrCode.content)) {
				return strategy.handle(qrCode);
			}
		}
		return null;
	}
}
