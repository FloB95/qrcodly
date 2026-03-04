import { inject, injectable } from 'tsyringe';
import { type IContentUpdateStrategy } from './update-strategies/content-update-strategy.interface';
import { UrlContentUpdateStrategy } from './update-strategies/url-content-update.strategy';
import { VCardContentUpdateStrategy } from './update-strategies/vcard-content-update.strategy';
import { DefaultContentUpdateStrategy } from './update-strategies/default-content-update.strategy';

@injectable()
export class ContentUpdateStrategyService {
	private readonly strategies: IContentUpdateStrategy[];
	private readonly defaultStrategy: IContentUpdateStrategy;

	constructor(
		@inject(UrlContentUpdateStrategy) urlStrategy: UrlContentUpdateStrategy,
		@inject(VCardContentUpdateStrategy) vcardStrategy: VCardContentUpdateStrategy,
		@inject(DefaultContentUpdateStrategy) defaultStrategy: DefaultContentUpdateStrategy,
	) {
		this.defaultStrategy = defaultStrategy;
		this.strategies = [urlStrategy, vcardStrategy];
	}

	resolve(contentType: string): IContentUpdateStrategy {
		return this.strategies.find((s) => s.supports(contentType)) ?? this.defaultStrategy;
	}
}
