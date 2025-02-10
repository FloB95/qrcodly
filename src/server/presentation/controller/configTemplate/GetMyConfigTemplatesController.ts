"use server";

import { currentUser } from "@clerk/nextjs/server";
import { type IController } from "../../interfaces/IController";
import { TRPCError } from "@trpc/server";
import { IConfigTemplateRepository } from "~/server/application/repositories/IConfigTemplateRepository";

class GetMyConfigTemplatesController implements IController {
  constructor(private configTemplateRepository: IConfigTemplateRepository) {}

  public async handle() {
    const user = await currentUser();
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const configTemplates = await this.configTemplateRepository.findByUserId(
      user.id,
    );

    console.log(configTemplates, "configTemplates");

    return configTemplates;
  }
}

export default GetMyConfigTemplatesController;
