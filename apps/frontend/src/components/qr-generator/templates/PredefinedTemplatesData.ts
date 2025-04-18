import { QrCodeDefaults } from "@/config/QrCodeDefaults";
import type { TCreateConfigTemplateDto } from "qrcodly-api-types";

export const PREDEFINED_TEMPLATES: TCreateConfigTemplateDto[] = [
  {
    name: "Default",
    config: QrCodeDefaults,
  },
  {
    name: "Business",
    config: {
      width: 1000,
      height: 1000,
      margin: 0,
      imageOptions: {
        hideBackgroundDots: true,
      },
      dotsOptions: {
        type: "dots",
        style: "#0000ff",
      },
      backgroundOptions: {
        style: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        style: "#0000ff",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        style: "#0000ff",
      },
    },
  },
  {
    name: "Event",
    config: {
      width: 1000,
      height: 1000,
      margin: 0,
      imageOptions: {
        hideBackgroundDots: true,
      },
      dotsOptions: {
        type: "rounded",
        style: "#ff0000",
      },
      backgroundOptions: {
        style: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        style: "#ff0000",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        style: "#ff0000",
      },
    },
  },
  {
    name: "Personal",
    config: {
      image: "",
      width: 1000,
      height: 1000,
      margin: 0,
      imageOptions: {
        hideBackgroundDots: true,
      },
      dotsOptions: {
        type: "classy",
        style: "#00ff00",
      },
      backgroundOptions: {
        style: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        style: "#00ff00",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        style: "#00ff00",
      },
    },
  },
];
