"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type ICreateQRcodeUseCase } from "~/server/application/useCases/qrcode/ICreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type IController } from "../../interfaces/IController";

class CreateQRcodeController implements IController {
  constructor(private createQRcodeUseCase: ICreateQRcodeUseCase) {}

  public async handle(input: TCreateQRcodeDto) {
    const user = await currentUser();
    const qrCode = await this.createQRcodeUseCase.execute(input, user?.id);

    return {
      success: true,
      isStored: qrCode.createdBy ? true : false,
      qrCodeId: qrCode.id,
    };
  }
}

export default CreateQRcodeController;
