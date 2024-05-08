"use server";

import { currentUser } from "@clerk/nextjs/server";
import { CreateQRcodeUseCase } from "~/server/application/useCases/qrcode/implementations/CreateQRcodeUseCase";
import { type ICreateQRcodeDto } from "~/server/domain/dtos/qrcode/ICreateQRcodeDto";

export const createQrCodeAction = async (input: ICreateQRcodeDto) => {
  const qrCodeConfig = input.config;
  const user = await currentUser();

  // if user is not logged in, or contentType is not url, remove editable
  if (!user || qrCodeConfig.contentType.type !== "url") {
    qrCodeConfig.contentType.editable = undefined;
  }

  const useCase = new CreateQRcodeUseCase();
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