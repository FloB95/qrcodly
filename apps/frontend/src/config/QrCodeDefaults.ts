import type { TQrCodeOptions } from 'qrcodly-api-types';

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
		//"style": {
		//    "type": "linear", // 'radial'
		//    "rotation": 0,
		//    "colorStops": [
		//        {
		//            "offset": 0,
		//            "color": "#8688B2"
		//        },
		//        {
		//            "offset": 1,
		//            "color": "#77779C"
		//        }
		//    ]
		//}
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
