export interface IBaseUseCase<TArgs extends unknown[] = unknown[], TResult = unknown> {
	execute(...args: TArgs): TResult | Promise<TResult>;
}
