// The bundler copies these files into the build and hands back their address. They are fetched
// only when a QR code is drawn (WebP files only for WebP logos).
const WASM_FILES = {
	resvg: new URL('@resvg/resvg-wasm/index_bg.wasm', import.meta.url),
	webpDecoder: new URL('@jsquash/webp/codec/dec/webp_dec.wasm', import.meta.url),
	pngEncoder: new URL('@jsquash/png/codec/pkg/squoosh_png_bg.wasm', import.meta.url),
};

export async function loadWasm(file: keyof typeof WASM_FILES): Promise<WebAssembly.Module> {
	const response = await fetch(WASM_FILES[file]);
	if (!response.ok) throw new Error(`${file}.wasm could not be loaded (${response.status})`);
	// not compileStreaming: that needs the application/wasm type, which not every server sends
	return WebAssembly.compile(await response.arrayBuffer());
}
