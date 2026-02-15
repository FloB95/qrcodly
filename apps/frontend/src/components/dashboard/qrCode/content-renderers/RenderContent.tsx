'use client';

import { memo } from 'react';
import Link from 'next/link';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { EventDetailsCard } from './EventDetailsCard';
import { ShortUrlDisplay } from './ShortUrlDisplay';
import { EmailDetailsCard } from './EmailDetailsCard';
import { VCardDetailsCard } from './VCardDetailsCard';

const renderUrlContent = (qr: TQrCodeWithRelationsResponseDto) => {
	if (qr.content.type !== 'url') return null;

	const { url, isEditable } = qr.content.data;

	if (isEditable && qr.shortUrl) {
		return <ShortUrlDisplay shortUrl={qr.shortUrl} destinationUrl={qr.shortUrl.destinationUrl} />;
	}

	return (
		<Link
			href={url}
			prefetch={false}
			target="_blank"
			onClick={(e) => e.stopPropagation()}
			className="text-muted-foreground hover:underline"
		>
			{url}
		</Link>
	);
};

const renderEventContent = (qr: TQrCodeWithRelationsResponseDto) => {
	if (qr.content.type !== 'event') return null;

	const eventData = qr.content.data;

	if (!qr.shortUrl) {
		return <EventDetailsCard event={eventData} trigger={eventData.title} />;
	}

	return (
		<ShortUrlDisplay
			shortUrl={qr.shortUrl}
			destinationUrl={qr.shortUrl.destinationUrl}
			destinationContent={<EventDetailsCard event={eventData} trigger={eventData.title} />}
		/>
	);
};

const renderVCardContent = (qr: TQrCodeWithRelationsResponseDto) => {
	if (qr.content.type !== 'vCard') return null;

	const vcardData = qr.content.data;
	const { firstName = '', lastName = '', isDynamic } = vcardData;
	const displayName = `${firstName} ${lastName}`.trim() || 'Contact';

	// If dynamic and has short URL, show with ShortUrlDisplay
	if (isDynamic && qr.shortUrl) {
		return (
			<ShortUrlDisplay
				shortUrl={qr.shortUrl}
				destinationUrl={qr.shortUrl.destinationUrl}
				destinationContent={<VCardDetailsCard vcard={vcardData} trigger={displayName} />}
			/>
		);
	}

	// Static vCard or no short URL - show basic name
	return displayName;
};

export const RenderContent = memo(({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	switch (qr.content.type) {
		case 'url':
			return renderUrlContent(qr);
		case 'text':
			return qr.content.data;
		case 'wifi':
			return qr.content.data?.ssid || '';
		case 'vCard':
			return renderVCardContent(qr);
		case 'email':
			return <EmailDetailsCard email={qr.content.data} />;
		case 'location':
			return qr.content.data.address || '';
		case 'event':
			return renderEventContent(qr);
		case 'epc': {
			const { name, iban, amount } = qr.content.data;
			const formattedAmount = amount ? `€${amount.toFixed(2)}` : '';
			const ibanLine = formattedAmount ? `${iban} · ${formattedAmount}` : iban;
			return (
				<div className="flex flex-col">
					<span className="font-semibold truncate">{name}</span>
					<span className="text-muted-foreground text-sm truncate">{ibanLine}</span>
				</div>
			);
		}
		default:
			return 'Unknown';
	}
});

RenderContent.displayName = 'RenderContent';
