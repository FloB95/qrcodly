import { docs } from 'fumadocs-mdx:collections/server';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';

export const source = loader({
	baseUrl: '/docs',
	source: docs.toFumadocsSource(),
	plugins: [openapiPlugin()],
});
