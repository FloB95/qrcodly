import { type TQrCodeOptions } from '../schemas/QrCode';

export const QrCodeDefaults: TQrCodeOptions = {
	width: 1000,
	height: 1000,
	image: '',
	margin: 0,
	imageOptions: {
		hideBackgroundDots: true,
	},
	dotsOptions: {
		style: {
			type: 'hex',
			value: '#000000',
		},
		type: 'rounded',
	},
	backgroundOptions: {
		style: {
			type: 'hex',
			value: '#FFFFFF',
		},
	},
	cornersSquareOptions: {
		style: {
			type: 'hex',
			value: '#000000',
		},
		type: 'extra-rounded',
	},
	cornersDotOptions: {
		style: {
			type: 'hex',
			value: '#000000',
		},
		type: 'dot',
	},
};
