import { TQrCodeOptions } from '../schemas/QrCode';

export const QrCodeDefaults: TQrCodeOptions = {
	width: 1000,
	height: 1000,
	image: '',
	margin: 0,
	imageOptions: {
		hideBackgroundDots: true,
	},
	dotsOptions: {
		style: '#000000',
		type: 'rounded',
	},
	backgroundOptions: {
		style: '#ffffff',
	},
	cornersSquareOptions: {
		style: '#000000',
		type: 'extra-rounded',
	},
	cornersDotOptions: {
		style: '#000000',
		type: 'dot',
	},
};
