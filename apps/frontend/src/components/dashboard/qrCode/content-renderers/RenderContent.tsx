'use client';

import { memo } from 'react';
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

	return url;
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
		default:
			return 'Unknown';
	}
});

RenderContent.displayName = 'RenderContent';
