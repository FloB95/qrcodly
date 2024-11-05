"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type ICreateQRcodeUseCase } from "~/server/application/useCases/qrcode/ICreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type IController } from "../../interfaces/IController";
class CreateQRcodeController implements IController {
  constructor(private createQRcodeUseCase: ICreateQRcodeUseCase) {}

  public async handle(input: TCreateQRcodeDto) {
    // merge input with default qrcode config
    const user = await currentUser();

    // if user is not logged in, or contentType is not url, remove editable
    if (input.contentType.type !== "url") {
      input.contentType.editable = undefined;
    } else if (!user) {
      input.contentType.editable = false;
    }

    const qrCode = await this.createQRcodeUseCase.execute(input, user?.id);

    return {
      success: true,
      isStored: qrCode.createdBy ? true : false,
    };
  }
}

export default CreateQRcodeController;
