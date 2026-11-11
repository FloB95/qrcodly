'use client';

import {
	isHostedPageContent,
	type THostedPageTemplateId,
	type TQrCodeContent,
} from '@shared/schemas';
import { parseTemplateImageKey, templateImageUrl } from '@/components/hosted-page/preview';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useUploadHostedFileMutation } from '@/lib/api/hosted-page';

// unused uploads are deleted after 24 hours; a cached template image is reused well before that
const TEMPLATE_UPLOAD_REUSE_MS = 12 * 60 * 60 * 1000;

/**
 * Uploads a template's sample cover or logo, so a saved page owns its images. Each image is
 * uploaded once per session and only on save: trying templates must not use up the pending
 * uploads or the upload rate. Resolves to the storage key, or null when the image is missing.
 */
export function useHostedTemplateImage() {
	const upload = useUploadHostedFileMutation();
	const { hostedTemplateUploads, rememberTemplateUpload, rememberHostedAsset } =
		useQrCodeGeneratorStore((state) => state);

	return async (
		id: THostedPageTemplateId,
		slot: 'coverKey' | 'logoKey',
	): Promise<string | null> => {
		const slotKey = `${id}:${slot}`;
		const cached = hostedTemplateUploads?.[slotKey];
		if (cached && Date.now() - cached.uploadedAt < TEMPLATE_UPLOAD_REUSE_MS) return cached.fileKey;

		const url = templateImageUrl(id, slot);
		const name = url.split('/').pop()!;
		const response = await fetch(url);
		if (!response.ok) return null;
		const file = new File([await response.blob()], name, {
			type: slot === 'coverKey' ? 'image/webp' : 'image/png',
		});
		const result = await upload.mutateAsync({ file, kind: 'image' });
		rememberHostedAsset(result.fileKey, result.url);
		rememberTemplateUpload(slotKey, result.fileKey);
		return result.fileKey;
	};
}

/** Before saving: uploads the template images the content still points at and puts in their keys. */
export function useResolveTemplateImages() {
	const templateImage = useHostedTemplateImage();

	return async <T extends TQrCodeContent>(content: T): Promise<T> => {
		if (!isHostedPageContent(content)) return content;
		const data: Record<string, unknown> = { ...content.data };
		let changed = false;
		for (const slot of ['coverKey', 'logoKey'] as const) {
			const image = parseTemplateImageKey(data[slot] as string | undefined);
			if (!image) continue;
			data[slot] = (await templateImage(image.id, image.slot)) ?? undefined;
			changed = true;
		}
		return changed ? { ...content, data } : content;
	};
}
