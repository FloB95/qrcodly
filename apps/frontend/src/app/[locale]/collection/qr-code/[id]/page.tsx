import { apiRequest, getShortUrlFromCode } from "@/lib/utils";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { TQrCodeWithRelationsResponseDto } from "@shared/schemas";
import { AnalyticsSection } from "@/components/dashboard/analytics/AnalyticsSection";
import Container from "@/components/ui/container";

interface QRCodeDetailProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function QRCodeDetailPage({ params }: QRCodeDetailProps) {
	const { id } = await params;

	// Fetch QR code details
	let qrCode: TQrCodeWithRelationsResponseDto | null = null;
	try {
		const { getToken } = await auth();
		const token = await getToken();

		qrCode = await apiRequest<TQrCodeWithRelationsResponseDto>(
			`/qr-code/${id}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			},
		);
	} catch (error) {
		console.error("Failed to fetch QR code details:", error);
	}

	// Handle not found
	if (!qrCode) {
		notFound();
	}

	return (
		<Container>
			<div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
				<h1 className="mb-4 text-2xl font-bold">QR Code Details</h1>
				<div className="mb-4">
					<strong>ID:</strong> {qrCode.id}
				</div>
				{qrCode.shortUrl?.shortCode && (
					<div className="mb-4">
						<strong>QR Code URL:</strong>{" "}
						<a
							href={getShortUrlFromCode(qrCode.shortUrl.shortCode)}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 underline"
						>
							{getShortUrlFromCode(qrCode.shortUrl.shortCode)}
						</a>
					</div>
				)}
				{qrCode.shortUrl?.destinationUrl && (
					<div className="mb-4">
						<strong>Ziel URL:</strong>{" "}
						<a
							href={qrCode.shortUrl.destinationUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 underline"
						>
							{qrCode.shortUrl.destinationUrl}
						</a>
					</div>
				)}
				<div className="mb-4">
					<strong>Created At:</strong>{" "}
					{new Date(qrCode.createdAt).toLocaleString()}
				</div>
				<div className="mb-4">
					<strong>Updated At:</strong>{" "}
					{qrCode.updatedAt ? new Date(qrCode.updatedAt).toLocaleString() : ""}
				</div>
			</div>
			{qrCode.shortUrl && (
				<AnalyticsSection shortCode={qrCode.shortUrl.shortCode} />
			)}
		</Container>
	);
}
