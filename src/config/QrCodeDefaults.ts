import {
  type DrawType,
  type TypeNumber,
  type Mode,
  type ErrorCorrectionLevel,
  type DotType,
  type CornerSquareType,
  type CornerDotType,
  type Options,
} from "qr-code-styling";

export const QrCodeDefaults: Options = {
  width: 1000,
  height: 1000,
  type: "canvas" as DrawType,
  data: "",
  image: "",
  margin: 0,
  qrOptions: {
    typeNumber: 0 as TypeNumber,
    mode: "Byte" as Mode,
    errorCorrectionLevel: "Q" as ErrorCorrectionLevel,
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 20,
    crossOrigin: "anonymous",
  },
  dotsOptions: {
    color: "#000000",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 0,
    //   colorStops: [{ offset: 0, color: '#8688B2' }, { offset: 1, color: '#77779C' }]
    // },
    type: "rounded" as DotType,
  },
  backgroundOptions: {
    color: "#ffffff",
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 0,
    //   colorStops: [{ offset: 0, color: '#ededff' }, { offset: 1, color: '#e6e7ff' }]
    // },
  },
  cornersSquareOptions: {
    color: "#000000",
    type: "extra-rounded" as CornerSquareType,
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 180,
    //   colorStops: [{ offset: 0, color: '#25456e' }, { offset: 1, color: '#4267b2' }]
    // },
  },
  cornersDotOptions: {
    color: "#000000",
    type: "dot" as CornerDotType,
    // gradient: {
    //   type: 'linear', // 'radial'
    //   rotation: 180,
    //   colorStops: [{ offset: 0, color: '#00266e' }, { offset: 1, color: '#4060b3' }]
    // },
  },
};
