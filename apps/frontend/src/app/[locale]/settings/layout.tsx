import { AppSidebar } from '@/components/app-sidebar';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { SiteHeader } from '@/components/site-header';
import Container from '@/components/ui/container';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<Container className="my-18">
				<SidebarProvider>
					<AppSidebar variant="inset" />
					<SidebarInset>
						<SiteHeader />
						<div className="flex flex-1 flex-col">
							<div className="@container/main flex flex-1 flex-col gap-2">
								<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</Container>
			<Footer />
		</>
	);
}
