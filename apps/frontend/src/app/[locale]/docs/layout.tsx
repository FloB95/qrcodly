import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { RootProvider } from 'fumadocs-ui/provider/next';

export default function Layout({ children }: LayoutProps<'/[locale]/docs'>) {
	return (
		<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<RootProvider
				theme={{
					enabled: false,
				}}
			>
				<DocsLayout tree={source.pageTree} {...baseOptions()}>
					{children}
				</DocsLayout>
			</RootProvider>
		</main>
	);
}
