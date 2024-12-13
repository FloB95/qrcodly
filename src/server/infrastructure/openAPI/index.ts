import { CreateQRcodeOpenAPISchema } from "./qrcode/CreateQRcodeSchema";

export const openAPI = {
  openapi: "3.0.3",
  info: {
    title: "BETA API Documentation",
    description:
      "This is a first version of the QRcodly API documentation. It is a BETA version!",
    version: "BETA 0.1.0",
  },
  externalDocs: {
    description: "Download API JSON",
    url: "/api/v1/doc",
  },
  servers: [
    {
      url: "https://www.qrcodly.de/api/v1", // Basis-URL hier angeben
      description: "Main API Server",
    },
  ],
  // schemes: ["https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [{ name: "QRcode", description: "QRcode related end-points" }],
  // securityDefinitions: {
  //   Bearer: {
  //     type: "apiKey",
  //     name: "Authorization",
  //     in: "header",
  //     description:
  //       'Enter the token with the `Bearer: ` prefix, e.g. "Bearer abcde12345".',
  //   },
  // },
  paths: {
    "/qrcode": {
      post: CreateQRcodeOpenAPISchema,
    },
  },
};
