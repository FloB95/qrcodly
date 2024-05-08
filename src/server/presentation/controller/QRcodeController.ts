"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type TQRcodeOptions } from "~/server/domain/types/QRcode";
import { CreateQRcodeUseCase } from "~/server/application/useCases/qrcode/implementations/CreateQRcodeUseCase";

export const createQrCodeAction = async (input: TQRcodeOptions) => {
  const user = await currentUser();

  // if user is not logged in, or contentType is not url, remove editable
  if (!user || input.contentType.type !== "url") {
    input.contentType.editable = undefined;
  }

  const useCase = new CreateQRcodeUseCase();
  const qrCode = await useCase.execute({
    config: input,
    createdBy: user?.id,
  });

  return {
    success: true,
    isStored: qrCode.createdBy ? true : false,
  };
};
