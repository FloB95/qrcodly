import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { TConfigTemplate } from "~/server/domain/types/ConfigTemplate";

export type TPredefinedTemplate = Omit<
  TConfigTemplate,
  "createdAt" | "updatedAt" | "createdBy"
>;
export const PREDEFINED_TEMPLATES: TPredefinedTemplate[] = [
  {
    id: "1",
    name: "Default",
    config: QrCodeDefaults,
  },
  {
    id: "2",
    name: "Business",
    config: {
      image: "",
      width: 1000,
      height: 1000,
      margin: 0,
      dotsOptions: {
        type: "dots",
        color: "#0000ff",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#0000ff",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#0000ff",
      },
    },
  },
  {
    id: "3",
    name: "Event",
    config: {
      image: "",
      width: 1000,
      height: 1000,
      margin: 0,
      dotsOptions: {
        type: "rounded",
        color: "#ff0000",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#ff0000",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#ff0000",
      },
    },
  },
  {
    id: "4",
    name: "Personal",
    config: {
      image: "",
      width: 1000,
      height: 1000,
      margin: 0,
      dotsOptions: {
        type: "classy",
        color: "#00ff00",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#00ff00",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#00ff00",
      },
    },
  },
];
