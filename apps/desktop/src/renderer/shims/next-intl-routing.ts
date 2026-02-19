// Shim for next-intl/routing — just export defineRouting as a pass-through
export function defineRouting<T>(config: T): T {
	return config;
}
