"use server";
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { TooManyRequestsError } from "~/server/application/errors/http/TooManyRequestsError";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import {
  FileExtension,
  type TFileExtension,
} from "~/server/domain/types/QRcode";
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
  const identifier = "api.qrcod2e.create";
  const result = await RateLimiter.limit(identifier);
  // rate limiter error
  if (!result.success) {
    throw new TooManyRequestsError();
  }

  // validate payload
  const payload = await req.json();
  const validatedPayload = CreateQRcodeDtoSchema.merge(
    z.object({ fileType: FileExtension.default("svg") }),
  ).parse(payload);
  const res = await createQRcodeControllerFactory().handle(validatedPayload);

  if (!res) {
    throw new Error("Failed to create QR code");
  }

  const qrCode = await generateQRcode(validatedPayload);
  const contentType = getContentType(validatedPayload.fileType);

  // return qr code as svg
  return new Response(qrCode, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
};

export const POST = (req: NextRequest) => ApiErrorHandler(createHandler, req);