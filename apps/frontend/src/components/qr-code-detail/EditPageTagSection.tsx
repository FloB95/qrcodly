'use client';

import { QrCodeTagBadges } from '../dashboard/qrCode/QrCodeTagBadges';
import type { TTagResponseDto } from '@shared/schemas';

type EditPageTagSectionProps = {
	qrCodeId: string;
	tags: TTagResponseDto[];
};

export const EditPageTagSection = ({ qrCodeId, tags }: EditPageTagSectionProps) => {
	return <QrCodeTagBadges qrCodeId={qrCodeId} tags={tags} />;
};
