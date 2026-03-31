export const BASE_URL = process.env.QRCODLY_API_BASE_URL || 'https://api.qrcodly.de';
export const PORT = Number(process.env.PORT || 3002);
export const HOST = process.env.HOST || '0.0.0.0';
export const DEFAULT_QR_CONFIG = {
    width: 1000,
    height: 1000,
    margin: 0,
    imageOptions: { hideBackgroundDots: true },
    dotsOptions: {
        style: { type: 'hex', value: '#000000' },
        type: 'rounded',
    },
    backgroundOptions: {
        style: { type: 'hex', value: '#FFFFFF' },
    },
    cornersSquareOptions: {
        style: { type: 'hex', value: '#000000' },
        type: 'extra-rounded',
    },
    cornersDotOptions: {
        style: { type: 'hex', value: '#000000' },
        type: 'dot',
    },
};
//# sourceMappingURL=config.js.map