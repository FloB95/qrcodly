import { SidebarTrigger } from '@/components/ui/sidebar';
import { HelpSupportHeaderButton } from '@/components/dashboard/help-support/HelpSupportHeaderButton';
import { WhatsNewButton } from '@/components/dashboard/announcements/WhatsNewButton';

export function SiteHeader() {
	return (
		<header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
			<div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-1">
					<WhatsNewButton />
					<HelpSupportHeaderButton />
				</div>
			</div>
		</header>
	);
}
