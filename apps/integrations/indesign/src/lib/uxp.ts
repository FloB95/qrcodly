type WriteOptions = { format?: unknown };
type UxpFile = {
	write: (data: ArrayBuffer | Uint8Array | string, options?: WriteOptions) => Promise<void>;
	nativePath: string;
};

export type UxpStorage = {
	secureStorage: {
		getItem: (key: string) => Promise<Uint8Array | null>;
		setItem: (key: string, value: Uint8Array) => Promise<void>;
		removeItem: (key: string) => Promise<void>;
	};
	localFileSystem: {
		getTemporaryFolder: () => Promise<{
			createFile: (name: string, options?: { overwrite?: boolean }) => Promise<UxpFile>;
		}>;
	};
	formats?: { binary: unknown };
};

type UxpModule = { storage: UxpStorage };

function getUxp(): UxpModule | null {
	try {
		return (
			(globalThis as unknown as { require?: (id: string) => UxpModule }).require?.('uxp') ?? null
		);
	} catch {
		return null;
	}
}

// Hand-rolled UTF-8 codec — older UXP hosts don't ship TextEncoder, and a
// runtime gap silently breaks getStoredApiKey() for non-ASCII keys.
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
		if (code < 0x80) bytes.push(code);
		else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		else if (code < 0x10000)
			bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		else
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
	}
	return new Uint8Array(bytes);
}

function bytesToString(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; ) {
		const b1 = bytes[i++];
		if (b1 < 0x80) out += String.fromCharCode(b1);
		else if (b1 < 0xe0) {
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
	return bytes ? bytesToString(bytes) : null;
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

function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export async function writeTempPngFromDataUrl(
	filename: string,
	pngDataUrl: string,
): Promise<string> {
	const match = pngDataUrl.match(/^data:[^;]+;base64,(.+)$/);
	if (!match) throw new Error('invalid PNG data URL');
	const bytes = base64ToBytes(match[1]);

	const uxp = getUxp();
	if (!uxp) throw new Error('UXP storage not available');
	const folder = await uxp.storage.localFileSystem.getTemporaryFolder();
	const file = await folder.createFile(filename, { overwrite: true });
	const binaryFormat = uxp.storage.formats?.binary;
	await file.write(bytes, binaryFormat ? { format: binaryFormat } : undefined);
	return file.nativePath;
}
