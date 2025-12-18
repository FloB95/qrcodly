import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	// @ts-ignore
	if (page.data.type === 'openapi') {
		const { APIPage } = await import('@/components/docs/api-page');
		return (
			<DocsPage full>
				<h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>

				<DocsBody>
					{/* @ts-ignore */}
					<APIPage {...page.data.getAPIPageProps()} />
				</DocsBody>
			</DocsPage>
		);
	}

	const MDX = page.data.body;

	return (
		<DocsPage full={page.data.full}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX
					components={getMDXComponents({
						// this allows you to link to other pages with relative file paths
						a: createRelativeLink(source, page),
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}
