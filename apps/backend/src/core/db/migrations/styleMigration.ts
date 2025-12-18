import { desc, eq } from 'drizzle-orm';
import db from '..';
import { configTemplate, qrCode } from '../schemas';
import { debugConsole } from '@/utils/general';

type ColorStop = { offset: number; color: string };
type Gradient = {
	type: 'gradient';
	gradientType: 'linear' | 'radial';
	rotation: number;
	colorStops: ColorStop[];
};

interface QrConfig {
	dotsOptions?: { type: string; style: string | Gradient };
	cornersDotOptions?: { type: string; style: string | Gradient };
	cornersSquareOptions?: { type: string; style: string | Gradient };
	backgroundOptions?: { style: string | Gradient };
	[key: string]: any;
}

function detectColorType(value: string): 'hex' | 'rgba' {
	if (value.startsWith('#')) return 'hex';
	return 'rgba'; // einfache Annahme: alles andere ist rgba
}

function migrateConfig(config: QrConfig): QrConfig {
	const styleFields = [
		'dotsOptions',
		'cornersDotOptions',
		'cornersSquareOptions',
		'backgroundOptions',
	];

	for (const field of styleFields) {
		const entry = config[field];
		if (!entry) continue;

		const style = entry.style;
		if (!style) continue;

		if (typeof style === 'string') {
			entry.style = {
				type: detectColorType(style),
				value: style,
			};
		}

		if (typeof style === 'object') {
			entry.style = {
				type: 'gradient',
				gradientType: style.type,
				rotation: style.rotation,
				colorStops: style.colorStops,
			};
		}
	}

	return config;
}

export async function test() {
	const rows = await db.select().from(qrCode).orderBy(desc(qrCode.createdAt)).execute();

	for (const item of rows) {
		const config = item.config as QrConfig;
		const migratedConfig = migrateConfig(config);

		await db
			.update(qrCode)
			.set({ config: migratedConfig as any })
			.where(eq(qrCode.id, item.id))
			.execute();
	}

	const rows2 = await db
		.select()
		.from(configTemplate)
		.orderBy(desc(configTemplate.createdAt))
		.execute();

	for (const item of rows2) {
		const config = item.config as QrConfig;
		const migratedConfig = migrateConfig(config);

		await db
			.update(configTemplate)
			.set({ config: migratedConfig as any })
			.where(eq(configTemplate.id, item.id))
			.execute();
	}
}
