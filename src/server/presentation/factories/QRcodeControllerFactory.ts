import { CreateQRcodeUseCase } from "~/server/application/useCases/qrcode/implementations/CreateQRcodeUseCase";
import { GetOneQRcodeByIdUseCase } from "~/server/application/useCases/qrcode/implementations/GetOneQRcodeByIdUseCase";
import { logger } from "~/server/infrastructure/logger";
import QRcodeRepository from "~/server/infrastructure/repositories/drizzle/QRcodeRepository";
import CreateQRcodeController from "~/server/presentation/controller/qrcode/CreateQRcodeController";
import DeleteQRcodeController from "../controller/qrcode/DeleteQRcodeController";
import { DeleteQRcodeUseCase } from "~/server/application/useCases/qrcode/implementations/DeleteQRcodeUseCase";
import { GetQRcodesUseCase } from "~/server/application/useCases/qrcode/implementations/GetQRcodesUseCase";
import GetQRcodesByController from "../controller/qrcode/GetQRcodesByController";

export const createQRcodeControllerFactory = () => {
  const qrCodeRepository = new QRcodeRepository();
  const createQRcodeUseCase = new CreateQRcodeUseCase(qrCodeRepository, logger);
  return new CreateQRcodeController(createQRcodeUseCase);
};

export const deleteQRcodeControllerFactory = () => {
  const qrCodeRepository = new QRcodeRepository();
  const deleteQRcodeUseCase = new DeleteQRcodeUseCase(qrCodeRepository, logger);
  const getQRcodeByIdUseCase = new GetOneQRcodeByIdUseCase(qrCodeRepository);
  return new DeleteQRcodeController(deleteQRcodeUseCase, getQRcodeByIdUseCase);
};

export const getQRcodesControllerFactory = () => {
  const qrCodeRepository = new QRcodeRepository();
  const getQRcodesUseCase = new GetQRcodesUseCase(qrCodeRepository);
  return new GetQRcodesByController(getQRcodesUseCase);
};
