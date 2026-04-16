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

function stringToBytes(value: string): Uint8Array {
	const bytes = new Uint8Array(value.length);
	for (let i = 0; i < value.length; i++) {
		bytes[i] = value.charCodeAt(i) & 0xff;
	}
	return bytes;
}

function bytesToString(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += String.fromCharCode(bytes[i]);
	}
	return out;
}

export async function getStoredApiKey(): Promise<string | null> {
	const uxp = getUxp();
	if (!uxp) return localStorage.getItem('qrcodly.apiKey');
	const bytes = await uxp.storage.secureStorage.getItem('qrcodly.apiKey');
	if (!bytes) return null;
	return bytesToString(bytes);
}

export async function storeApiKey(key: string): Promise<void> {
	const uxp = getUxp();
	if (!uxp) {
		localStorage.setItem('qrcodly.apiKey', key);
		return;
	}
	await uxp.storage.secureStorage.setItem('qrcodly.apiKey', stringToBytes(key));
}

export async function clearApiKey(): Promise<void> {
	const uxp = getUxp();
	if (!uxp) {
		localStorage.removeItem('qrcodly.apiKey');
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
