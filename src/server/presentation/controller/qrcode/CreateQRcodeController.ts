"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type ICreateQRcodeUseCase } from "~/server/application/useCases/qrcode/ICreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type IController } from "../../interfaces/IController";
class CreateQRcodeController implements IController {
  constructor(private createQRcodeUseCase: ICreateQRcodeUseCase) {}

  public async handle(input: TCreateQRcodeDto) {
    const qrCodeConfig = input.config;
    const user = await currentUser();

    // if user is not logged in, or contentType is not url, remove editable
    if (!user || qrCodeConfig.contentType.type !== "url") {
      qrCodeConfig.contentType.editable = undefined;
    }

    const qrCode = await this.createQRcodeUseCase.execute(
      {
        config: qrCodeConfig,
      },
      user?.id,
    );

    return {
      success: true,
      isStored: qrCode.createdBy ? true : false,
    };
  }
}

export default CreateQRcodeController;
