import { TRPCError } from "@trpc/server";
import { currentUser } from "@clerk/nextjs/server";
import { type IDeleteQRcodeUseCase } from "~/server/application/useCases/qrcode/IDeleteQRcodeUseCase";
import { type IGetOneQRcodeByIdUseCase } from "~/server/application/useCases/qrcode/IGetOneQRcodeByIdUseCase";
import { type TDeleteQRcodeDto } from "~/server/domain/dtos/qrcode/TDeleteQRcodeDto";
import { type IController } from "../../interfaces/IController";

class DeleteQRcodeController implements IController {
  constructor(
    private deleteQRcodeUseCase: IDeleteQRcodeUseCase,
    private getQRcodeByIdUseCase: IGetOneQRcodeByIdUseCase,
  ) {}

  /**
   * Handles the deletion of a QR code.
   * @param input The input data containing the ID of the QR code to be deleted.
   * @returns An object indicating the success of the deletion.
   * @throws TRPCError if the user is not authenticated, the QR code is not found, or the user is not authorized to delete the QR code.
   */
  public async handle(input: TDeleteQRcodeDto) {
    const qrCodeId = input.id;
    const user = await currentUser();

    // Check if the user is authenticated
    if (!user) {
      throw new TRPCError({
        message: "Access denied",
        code: "UNAUTHORIZED",
      });
    }

    // Retrieve the QR code by its ID
    const qrCode = await this.getQRcodeByIdUseCase.execute(qrCodeId);

    // Check if the QR code exists
    if (!qrCode) {
      throw new TRPCError({
        message: "QR code not found.",
        code: "NOT_FOUND",
      });
    }

    // Check if the authenticated user is the creator of the QR code
    if (qrCode.createdBy !== user.id) {
      throw new TRPCError({
        message: "Access denied",
        code: "UNAUTHORIZED",
      });
    }

    // Execute the deletion use case
    const isDeleted = await this.deleteQRcodeUseCase.execute(qrCode, user.id);

    // Return the result of the deletion
    return {
      success: isDeleted,
    };
  }
}

export default DeleteQRcodeController;
