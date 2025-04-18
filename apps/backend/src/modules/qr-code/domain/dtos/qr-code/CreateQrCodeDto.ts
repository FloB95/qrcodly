import { QrCodeSchema } from '../../schemas/QrCode';
import { z } from 'zod';

const QRcodeSchemaDef = QrCodeSchema._def.schema; // Extract the base schema from the PanelSchema
const t = QrCodeSchema._def.effect;

export const CreateQrCodeDto = z.effect(
	QRcodeSchemaDef.pick({
		config: true,
		contentType: true,
		content: true,
	}),
	{
		type: 'refinement',
		// ZOD Bugfix to keep refinement

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		refinement: t.refinement,
	},
);

export type TCreateQrCodeDto = z.infer<typeof CreateQrCodeDto>;
