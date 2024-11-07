import { CreateQRcodeSwaggerSchema } from "./qrcode/CreateQRcodeSchema";

export const swagger = {
  swagger: "2.0",
  info: {
    title: "BETA API Documentation",
    description:
      "This is a first version of the QRcodly API documentation. It is a BETA version and will be updated soon.",
    version: "BETA 0.1.0",
  },
  externalDocs: {
    description: "Download API JSON",
    url: "/api/v1/doc",
  },
  host: "https://www.qrcodly.de",
  basePath: "/api/v1",
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
      post: CreateQRcodeSwaggerSchema,
    },
  },
};
