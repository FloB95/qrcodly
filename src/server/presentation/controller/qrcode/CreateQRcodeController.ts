"use server";

import { currentUser } from "@clerk/nextjs/server";
import { CreateQRcodeUseCase } from "~/server/application/useCases/qrcode/implementations/CreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { logger } from "~/server/infrastructure/logger";
import QRcodeRepository from "~/server/infrastructure/repositories/drizzle/QRcodeRepository";

export const createQrCodeAction = async (input: TCreateQRcodeDto) => {
  const qrCodeConfig = input.config;
  const user = await currentUser();

  // if user is not logged in, or contentType is not url, remove editable
  if (!user || qrCodeConfig.contentType.type !== "url") {
    qrCodeConfig.contentType.editable = undefined;
  }

  const qrCodeRepository = new QRcodeRepository();
  const useCase = new CreateQRcodeUseCase(qrCodeRepository, logger);
  const qrCode = await useCase.execute(
    {
      config: qrCodeConfig,
    },
    user?.id,
  );

  return {
    success: true,
    isStored: qrCode.createdBy ? true : false,
  };
};
