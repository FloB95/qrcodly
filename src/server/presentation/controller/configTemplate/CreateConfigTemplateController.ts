"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type IController } from "../../interfaces/IController";
import { TCreateConfigTemplateDto } from "~/server/domain/dtos/configTemplate/TCreateConfigTemplateDto";
import { TRPCError } from "@trpc/server";
import { ICreateConfigTemplateUseCase } from "~/server/application/useCases/configTemplate/ICreateConfigTemplateUseCase";

class CreateConfigTemplateController implements IController {
  constructor(private createQRcodeUseCase: ICreateConfigTemplateUseCase) {}

  public async handle(input: TCreateConfigTemplateDto) {
    const user = await currentUser();
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const configTemplate = await this.createQRcodeUseCase.execute(
      input,
      user.id,
    );

    return {
      success: true,
      templateId: configTemplate.id,
    };
  }
}

export default CreateConfigTemplateController;
