import { logger } from "~/server/infrastructure/logger";
import EventEmitter from "~/server/infrastructure/events";
import CreateConfigTemplateController from "../controller/configTemplate/CreateConfigTemplateController";
import { CreateConfigTemplateUseCase } from "~/server/application/useCases/configTemplate/implementations/CreateConfigTemplateUseCase";
import ConfigTemplateRepository from "~/server/infrastructure/repositories/drizzle/ConfigTemplateRepository";

export const createConfigTemplateControllerFactory = () => {
  const configTemplateRepository = new ConfigTemplateRepository();
  const createQRcodeUseCase = new CreateConfigTemplateUseCase(
    configTemplateRepository,
    logger,
    EventEmitter,
  );
  return new CreateConfigTemplateController(createQRcodeUseCase);
};
