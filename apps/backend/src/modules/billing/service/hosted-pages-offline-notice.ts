import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { HostedPageService } from '@/modules/hosted-page/service/hosted-page.service';

/**
 * Template values naming the hosted pages that go offline once Pro ends. A failed lookup leaves
 * them out: the mail itself matters more than the list.
 */
export async function hostedPagesOfflineNotice(userId: string) {
	try {
		const { titles, productPages } = await container
			.resolve(HostedPageService)
			.offlineNotice(userId);
		return {
			affectedPages: titles,
			hasAffectedPages: titles.length > 0,
			hasProductPages: productPages > 0,
		};
	} catch (error) {
		container.resolve(Logger).warn('billing.hostedPagesOfflineNotice.failed', {
			user: { id: userId },
			error: error as Error,
		});
		return { affectedPages: [], hasAffectedPages: false, hasProductPages: false };
	}
}
