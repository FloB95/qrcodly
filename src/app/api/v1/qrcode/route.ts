import { type NextRequest } from "next/server";
import { BadRequestError } from "~/server/application/errors/http";
import { TooManyRequestsError } from "~/server/application/errors/http/TooManyRequestsError";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type TFileExtension } from "~/server/domain/types/QRcode";
import { RateLimiter } from "~/server/infrastructure/ratelimit";
import { createQRcodeControllerFactory } from "~/server/presentation/factories/QRcodeControllerFactory";
import { ApiErrorHandler } from "~/server/presentation/utils/ApiErrorHandler";
import { generateQRcode } from "~/server/presentation/utils/ServerSideQRcode";

const getContentType = (extension: TFileExtension): string => {
  const contentTypeMap: Record<TFileExtension, string> = {
    svg: "image/svg+xml",
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  return contentTypeMap[extension];
};

const createHandler = async (req: NextRequest) => {
  const identifier = "api.qrcode.create";
  const result = await RateLimiter.limit(identifier);
  // rate limiter error
  if (!result.success) {
    throw new TooManyRequestsError();
  }

  // validate payload
  const payload = await req.json() as unknown;
  const validatedPayload = CreateQRcodeDtoSchema.parse(payload as Record<string, unknown>);
  const res = await createQRcodeControllerFactory().handle(validatedPayload);

  if (!res) {
    throw new Error("Failed to create QR code");
  }

  const qrCode = await generateQRcode(validatedPayload);

  if (!qrCode) {
    throw new BadRequestError("Failed to generate QR code");
  }

  const contentType = getContentType(validatedPayload.fileType);

  // return qr code as svg
  return new Response(qrCode, {
    status: 201,
    headers: { "Content-Type": contentType },
  });
};

export const POST = async (req: NextRequest) =>
  ApiErrorHandler(createHandler, req);
