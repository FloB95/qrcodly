'use client';

import { memo } from 'react';
import Link from 'next/link';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { EventDetailsCard } from './EventDetailsCard';
import { ShortUrlDisplay } from './ShortUrlDisplay';
import { EmailDetailsCard } from './EmailDetailsCard';
import { VCardDetailsCard } from './VCardDetailsCard';
import { WifiDetailsCard } from './WifiDetailsCard';
import { EpcDetailsCard } from './EpcDetailsCard';
import { LocationDetailsCard } from './LocationDetailsCard';

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
			onContextMenu={(e) => e.stopPropagation()}
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

	if (isDynamic && qr.shortUrl) {
		return (
			<ShortUrlDisplay
				shortUrl={qr.shortUrl}
				destinationUrl={qr.shortUrl.destinationUrl}
				destinationContent={<VCardDetailsCard vcard={vcardData} trigger={displayName} />}
			/>
		);
	}

	return <VCardDetailsCard vcard={vcardData} trigger={displayName} />;
};

export const RenderContent = memo(({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	switch (qr.content.type) {
		case 'url':
			return renderUrlContent(qr);
		case 'text':
			return qr.content.data;
		case 'wifi':
			return <WifiDetailsCard wifi={qr.content.data} />;
		case 'vCard':
			return renderVCardContent(qr);
		case 'email':
			return <EmailDetailsCard email={qr.content.data} />;
		case 'location':
			return <LocationDetailsCard location={qr.content.data} />;
		case 'event':
			return renderEventContent(qr);
		case 'epc':
			return <EpcDetailsCard epc={qr.content.data} />;
		default:
			return 'Unknown';
	}
});

RenderContent.displayName = 'RenderContent';
