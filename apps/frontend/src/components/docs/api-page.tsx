import { openapi } from '@/lib/openapi';
import type { OpenAPIPageProps_Preloaded } from 'fumadocs-openapi/ui';
import { OpenAPIPageClient } from './api-page.client';

type GeneratedPageProps = Omit<OpenAPIPageProps_Preloaded, 'preloaded'>;

/**
 * Server wrapper: bundles the OpenAPI schema on the server and hands it to the
 * client page as `preloaded`, as required by fumadocs-openapi v11.
 */
export async function APIPage(props: GeneratedPageProps) {
	const { bundled } = await openapi.getSchema(props.document);

	return <OpenAPIPageClient {...props} preloaded={{ docs: { [props.document]: bundled } }} />;
}
