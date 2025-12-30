import { auth } from '@clerk/nextjs/server';
import { apiRequest } from '@/lib/utils';
import {
	convertEventObjToString,
	type TQrCodeWithRelationsResponseDto,
	type TEventInput,
	type TQrCodeContentType,
} from '@shared/schemas';
import { notFound } from 'next/navigation';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const SUPPORTED_QR_CODE_TYPES: TQrCodeContentType[] = ['event'];

	let qrCode: TQrCodeWithRelationsResponseDto | null = null;

	try {
		const { getToken } = await auth();
		const token = await getToken();

		qrCode = await apiRequest<TQrCodeWithRelationsResponseDto>(`/qr-code/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
	} catch (err) {
		console.error(err);
		return notFound();
	}

	if (!qrCode || !SUPPORTED_QR_CODE_TYPES.includes(qrCode.content.type)) {
		return notFound();
	}

	// TODO implement service class to handle different download strategies
	const eventData = qrCode.content.data as TEventInput;
	const iCalString = convertEventObjToString(eventData);

	return new Response(iCalString, {
		status: 200,
		headers: {
			'Content-Type': 'text/calendar;charset=utf-8',
			'Content-Disposition': `attachment; filename="${(qrCode.content.data as TEventInput).title}.ics"`,
		},
	});
}
