export type UxpStorage = {
	secureStorage: {
		getItem: (key: string) => Promise<Uint8Array | null>;
		setItem: (key: string, value: Uint8Array) => Promise<void>;
		removeItem: (key: string) => Promise<void>;
	};
	localFileSystem: {
		getTemporaryFolder: () => Promise<{
			createFile: (
				name: string,
				options?: { overwrite?: boolean },
			) => Promise<{ write: (data: string) => Promise<void>; nativePath: string }>;
		}>;
	};
};

type UxpModule = { storage: UxpStorage };

function getUxp(): UxpModule | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return (
			(globalThis as unknown as { require?: (id: string) => UxpModule }).require?.('uxp') ?? null
		);
	} catch {
		return null;
	}
}

// Hand-rolled UTF-8 encode/decode. UXP's runtime does expose TextEncoder on
// InDesign 18.5+ in practice, but older hosts do not, and any runtime gap
// here silently rejects getStoredApiKey() and leaves the panel stuck on the
// loading screen. Doing it by hand keeps API keys with non-ASCII characters
// intact without depending on whichever runtime APIs the host ships.
function stringToBytes(value: string): Uint8Array {
	const bytes: number[] = [];
	for (let i = 0; i < value.length; i++) {
		let code = value.charCodeAt(i);
		if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
			const low = value.charCodeAt(i + 1);
			if (low >= 0xdc00 && low <= 0xdfff) {
				code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
				i++;
			}
		}
		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0x10000) {
			bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}
	return new Uint8Array(bytes);
}

function bytesToString(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; ) {
		const b1 = bytes[i++];
		if (b1 < 0x80) {
			out += String.fromCharCode(b1);
		} else if (b1 < 0xe0) {
			const b2 = bytes[i++] ?? 0;
			out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
		} else if (b1 < 0xf0) {
			const b2 = bytes[i++] ?? 0;
			const b3 = bytes[i++] ?? 0;
			out += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
		} else {
			const b2 = bytes[i++] ?? 0;
			const b3 = bytes[i++] ?? 0;
			const b4 = bytes[i++] ?? 0;
			const cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
			const offset = cp - 0x10000;
			out += String.fromCharCode(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
		}
	}
	return out;
}

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined' && localStorage !== null;
}

export async function getStoredApiKey(): Promise<string | null> {
	const uxp = getUxp();
	if (!uxp) return hasLocalStorage() ? localStorage.getItem('qrcodly.apiKey') : null;
	const bytes = await uxp.storage.secureStorage.getItem('qrcodly.apiKey');
	if (!bytes) return null;
	return bytesToString(bytes);
}

export async function storeApiKey(key: string): Promise<void> {
	const uxp = getUxp();
	if (!uxp) {
		if (hasLocalStorage()) localStorage.setItem('qrcodly.apiKey', key);
		return;
	}
	await uxp.storage.secureStorage.setItem('qrcodly.apiKey', stringToBytes(key));
}

export async function clearApiKey(): Promise<void> {
	const uxp = getUxp();
	if (!uxp) {
		if (hasLocalStorage()) localStorage.removeItem('qrcodly.apiKey');
		return;
	}
	await uxp.storage.secureStorage.removeItem('qrcodly.apiKey');
}

export async function writeTempSvg(filename: string, svg: string): Promise<string> {
	const uxp = getUxp();
	if (!uxp) throw new Error('UXP storage not available');
	const folder = await uxp.storage.localFileSystem.getTemporaryFolder();
	const file = await folder.createFile(filename, { overwrite: true });
	await file.write(svg);
	return file.nativePath;
}

function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export async function writeTempPngFromDataUrl(
	filename: string,
	pngDataUrl: string,
): Promise<string> {
	const match = pngDataUrl.match(/^data:[^;]+;base64,(.+)$/);
	if (!match) throw new Error('invalid PNG data URL');
	const bytes = base64ToBytes(match[1]);

	const uxpGlobal = (
		globalThis as unknown as {
			require?: (id: string) => { storage: { formats?: { binary: unknown } } };
		}
	).require?.('uxp');
	const binaryFormat = uxpGlobal?.storage?.formats?.binary;

	const uxp = getUxp();
	if (!uxp) throw new Error('UXP storage not available');
	const folder = await uxp.storage.localFileSystem.getTemporaryFolder();
	const file = (await folder.createFile(filename, { overwrite: true })) as {
		write: (data: ArrayBuffer | Uint8Array, options?: unknown) => Promise<void>;
		nativePath: string;
	};
	await file.write(bytes.buffer, binaryFormat ? { format: binaryFormat } : undefined);
	return file.nativePath;
}

export const _internal = { stringToBytes, bytesToString };
