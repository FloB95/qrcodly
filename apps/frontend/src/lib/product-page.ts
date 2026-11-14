import { ProductInputSchema, productPageType, type TProductInput } from '@shared/schemas';

/** Dotted paths of what a product page still lacks before it can be saved, each named once. */
export function productPageIssues(data: TProductInput): string[] {
	const parsed = ProductInputSchema.safeParse(data);
	const paths = [
		...(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path)),
		...productPageType.inputIssues(data).map((issue) => issue.path),
	].map((path) => path.filter((part) => typeof part === 'string').join('.'));
	return [...new Set(paths)];
}
