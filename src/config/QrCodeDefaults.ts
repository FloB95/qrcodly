import { type TQRcodeOptions } from "~/server/domain/types/QRcode";

export const QrCodeDefaults: TQRcodeOptions = {
  shape: "square",
  width: 1000,
  height: 1000,
  type: "canvas",
  contentType: {
    type: "url",
    editable: false,
  },
  data: "",
  image: "",
  margin: 0,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "Q",
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 30,
    crossOrigin: "anonymous",
  },
  dotsOptions: {
    color: "#000000",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 0,
    //   colorStops: [{ offset: 0, color: '#8688B2' }, { offset: 1, color: '#77779C' }]
    // },
    type: "rounded",
  },
  backgroundOptions: {
    round: 0,
    color: "#ffffff",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 0,
    //   colorStops: [{ offset: 0, color: '#ededff' }, { offset: 1, color: '#e6e7ff' }]
    // },
  },
  cornersSquareOptions: {
    color: "#000000",
    type: "extra-rounded",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 180,
    //   colorStops: [{ offset: 0, color: '#25456e' }, { offset: 1, color: '#4267b2' }]
    // },
  },
  cornersDotOptions: {
    color: "#000000",
    type: "dot",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 180,
    //   colorStops: [{ offset: 0, color: '#00266e' }, { offset: 1, color: '#4060b3' }]
    // },
  },
};
