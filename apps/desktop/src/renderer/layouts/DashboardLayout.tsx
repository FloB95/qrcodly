import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout() {
	return (
		<div
			className="min-h-screen"
			style={{
				// Add padding for macOS traffic lights
				paddingTop: window.electronAPI ? (navigator.platform.includes('Mac') ? 36 : 0) : 0,
			}}
		>
			<SidebarProvider className="relative overflow-clip">
				<DashboardSidebar variant="inset" />
				<SidebarInset>
					<SiteHeader />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2">
							<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
								<Outlet />
							</div>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
