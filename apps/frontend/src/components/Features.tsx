import {
	QrCodeIcon,
	RectangleStackIcon,
	StarIcon,
} from "@heroicons/react/24/outline";
import React from "react";

export const Features = () => {
	return (
		<div className="my-32 space-y-5">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="mb-4 text-4xl font-bold">Features für deine QR-Codes</h2>
				<p className="text-accent-foreground text-xl sm:text-2xl">
					Entdecke, wie Qrcodly.de dir hilft, das Beste aus deinen QR-Codes
					herauszuholen.
				</p>
			</div>

			<div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<QrCodeIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">
						Kostenlose QR-Codes mit intelligenten Funktionen
					</h2>
					<p className="text-gray-600">
						Generiere QR-Codes für deine URLs. Verfolge die Performance mit
						detaillierten Statistiken und bearbeite die Ziel-URL jederzeit, auch
						nachdem der Code gedruckt wurde.
					</p>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<RectangleStackIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">
						Übersichtliche QR-Code Kollektionen
					</h2>
					<p className="text-gray-600">
						Behalte den Überblick über alle deine generierten QR-Codes an einem
						zentralen Ort. Organisiere deine Codes in Kollektionen für besseres
						Management und schnellen Zugriff.
					</p>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<StarIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">
						Schnelles Design mit Vorlagen
					</h2>
					<p className="text-gray-600">
						Spare Zeit und sorge für einheitliches Branding. Erstelle Vorlagen
						mit deinen bevorzugten Styles und wende diese einfach auf neue
						QR-Codes an.
					</p>
				</div>
			</div>
		</div>
	);
};
