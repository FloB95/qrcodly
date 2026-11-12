'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { type Options } from 'qr-code-styling';
import { cn, createLinkFromShortUrl } from '@/lib/utils';
import { renderQrCodePng } from '@/lib/qr-render';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	isDynamic,
	type TQrCode,
	type TShortUrlResponseDto,
	type TShortUrlWithCustomDomainResponseDto,
} from '@shared/schemas';
import { DynamicBadge } from './DynamicBadge';
import { DefaultDomainPicker } from './DefaultDomainPicker';
import { SmartTipPopover } from '@/components/dashboard/smart-tips/SmartTipPopover';
import { useShortUrlLink } from '@/hooks/use-short-url-link';

export type QrCodeProps = {
	qrCode: Pick<TQrCode, 'config' | 'content'> & { qrCodeData?: TQrCode['qrCodeData'] };
	additionalStyles?: string;
	shortUrl?: TShortUrlWithCustomDomainResponseDto | TShortUrlResponseDto;
	hasProPlan?: boolean;
	hideDomainEdit?: boolean;
};

function getQrCodeData(props: QrCodeProps): string {
	const { qrCode, shortUrl } = props;

	// Use stored qrCodeData if available (has correct custom domain baked in)
	if (qrCode.qrCodeData) {
		return qrCode.qrCodeData;
	}

	// Otherwise compute on the fly (for preview/generator)
	return (
		convertQRCodeDataToStringByType(
			qrCode.content,
			shortUrl ? createLinkFromShortUrl(shortUrl) : undefined,
		) || 'https://qrcodly.de'
	);
}

/**
 * Which custom domain the short URL points at, as far as the props reveal it.
 *
 * `getQrCodeData` cannot see this: it builds the link without a resolved domain, and a short URL
 * that only carries `customDomainId` therefore always renders as the system link there. Comparing
 * the id separately is what lets a domain switch through — the component resolves the id to a host
 * itself, so without this the memo would report "equal" and the link under the code would freeze
 * on the previous domain.
 */
function getCustomDomainKey(props: QrCodeProps): string | null {
	const { shortUrl } = props;
	if (!shortUrl) return null;
	return 'customDomain' in shortUrl
		? (shortUrl.customDomain?.id ?? null)
		: (shortUrl.customDomainId ?? null);
}

function areQrCodePropsEqual(prev: QrCodeProps, next: QrCodeProps) {
	if (getCustomDomainKey(prev) !== getCustomDomainKey(next)) return false;

	const optionsPrev: Options = {
		...convertQrCodeOptionsToLibraryOptions(prev.qrCode.config),
		data: getQrCodeData(prev),
	};

	const optionsNext: Options = {
		...convertQrCodeOptionsToLibraryOptions(next.qrCode.config),
		data: getQrCodeData(next),
	};

	return JSON.stringify(optionsPrev) == JSON.stringify(optionsNext);
}

function QrCode({
	qrCode,
	additionalStyles = '',
	shortUrl,
	hasProPlan,
	hideDomainEdit,
}: QrCodeProps) {
	const { link: resolvedShortUrl } = useShortUrlLink(shortUrl);
	const { link: shortUrlDisplay } = useShortUrlLink(shortUrl, true);

	const options: Options = useMemo(() => {
		// Use stored qrCodeData if available (has correct custom domain baked in)
		const data =
			qrCode.qrCodeData ??
			((isDynamic(qrCode.content) && resolvedShortUrl
				? convertQRCodeDataToStringByType(qrCode.content, resolvedShortUrl)
				: convertQRCodeDataToStringByType(qrCode.content)) ||
				'https://qrcodly.de');

		return {
			...convertQrCodeOptionsToLibraryOptions(qrCode.config),
			data,
		};
	}, [qrCode.config, qrCode.content, qrCode.qrCodeData, resolvedShortUrl]);
	const [pngUrl, setPngUrl] = useState<string>();

	useEffect(() => {
		let isCurrent = true;
		renderQrCodePng(options)
			.then((png) => isCurrent && setPngUrl(URL.createObjectURL(png)))
			.catch((error: unknown) => console.error('QR code preview failed', error));
		return () => {
			isCurrent = false;
		};
	}, [options]);

	// the previous image is released once the next one is on screen
	useEffect(
		() => () => {
			if (pngUrl) URL.revokeObjectURL(pngUrl);
		},
		[pngUrl],
	);

	return (
		<div className="flex flex-col">
			<div
				className={cn(
					'canvas-wrap mx-auto max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]',
					additionalStyles,
				)}
			>
				{/* eslint-disable-next-line @next/next/no-img-element -- generated PNG */}
				{pngUrl && <img src={pngUrl} alt="" />}
			</div>

			{shortUrl && isDynamic(qrCode.content) && (
				<div className="mt-4 hidden flex-wrap xs:flex items-center justify-between">
					<DynamicBadge />
					<SmartTipPopover
						anchor="dynamic-url"
						stateContext={{
							hasDynamicQr: true,
							hasCustomDomain:
								('customDomain' in shortUrl && !!shortUrl.customDomain) ||
								('customDomainId' in shortUrl && !!shortUrl.customDomainId),
							hasProPlan,
						}}
					>
						<div className="text-xs ml-4 flex items-center gap-1">
							<span className="pt-0.5">{shortUrlDisplay}</span>
							{!hideDomainEdit && <DefaultDomainPicker />}
						</div>
					</SmartTipPopover>
				</div>
			)}
		</div>
	);
}

export default memo(QrCode, areQrCodePropsEqual);
