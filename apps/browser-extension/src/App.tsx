import { ChangeEvent, useEffect, useRef, useState } from 'react';
import QRCodeStyling, {
	DrawType,
	TypeNumber,
	Mode,
	ErrorCorrectionLevel,
	DotType,
	CornerSquareType,
	CornerDotType,
	FileExtension,
	Options,
} from 'qr-code-styling';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://qrcodly.de/api/qr?text=';

const ext = (globalThis as any).chrome || (globalThis as any).browser;

export default function App() {
	const [error, setError] = useState<string | null>(null);
	console.log('init');

	useEffect(() => {
		try {
			ext.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
				const tab = tabs?.[0];
				if (tab?.url) {
					setOptions((options) => ({
						...options,
						data: tab.url,
					}));
				}
			});
		} catch {
			setError('Browser API nicht verfügbar');
		}
	}, []);

	const [options, setOptions] = useState<Options>({
		width: 300,
		height: 300,
		type: 'canvas' as DrawType,
		data: 'https://www.qrcodly.de/de',
		margin: 10,
		qrOptions: {
			typeNumber: 0 as TypeNumber,
			mode: 'Byte' as Mode,
			errorCorrectionLevel: 'Q' as ErrorCorrectionLevel,
		},
		imageOptions: {
			hideBackgroundDots: true,
			imageSize: 0.4,
			margin: 20,
			crossOrigin: 'anonymous',
		},
		dotsOptions: {
			color: '#000000',
			type: 'rounded' as DotType,
		},
		backgroundOptions: {
			color: 'transparent',
		},
		cornersSquareOptions: {
			color: '#000000',
			type: 'extra-rounded' as CornerSquareType,
		},
		cornersDotOptions: {
			color: '#000000',
			type: 'dot' as CornerDotType,
		},
	});
	const [fileExt, setFileExt] = useState<FileExtension>('svg');
	const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(options));
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (ref.current) {
			qrCode.append(ref.current);
		}
	}, [qrCode, ref]);

	useEffect(() => {
		if (!qrCode) return;
		qrCode.update(options);
	}, [qrCode, options]);

	const onExtensionChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setFileExt(event.target.value as FileExtension);
	};

	const onDownloadClick = () => {
		if (!qrCode) return;

		qrCode.download({
			extension: fileExt,
		});
	};

	return (
		<div className="w-[340px] bg-gradient-to-br from-zinc-50 to-orange-100 p-3 font-sans text-gray-800">
			<h1 className="text-lg font-bold mb-3 text-center">QRcodly</h1>

			<div className="mb-2">
				<label className="text-xs text-gray-500">URL</label>
				<input
					className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
					value={options.data}
					disabled
				/>
			</div>

			<div ref={ref} />
			<div>
				<select onChange={onExtensionChange} value={fileExt}>
					<option value="svg">SVG</option>
					<option value="png">PNG</option>
					<option value="jpeg">JPEG</option>
					<option value="webp">WEBP</option>
				</select>
				<button onClick={onDownloadClick}>Download</button>
			</div>

			{error && <div className="mt-2 text-xs text-red-600">{error}</div>}
		</div>
	);
}
