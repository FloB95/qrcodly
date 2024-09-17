/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type IGetQRcodesUseCase } from "~/server/application/useCases/qrcode/IGetQRcodesUseCase";
import { type IController } from "../../interfaces/IController";
import { type IPaginationDto } from "~/server/domain/dtos/IPaginationDto";
import { type TQRcodeResponseDto } from "~/server/domain/dtos/qrcode/TQRcodeResponseDto";
import { QRcodePaginationResponseSchema } from "~/server/domain/dtos/qrcode/TQRcodePaginatedResponseDto";
import { type TQRcodesRequestDto } from "~/server/domain/dtos/qrcode/TQRcodesRequestDto";

class GetQRcodesByController implements IController {
  constructor(private getQRcodesUseCase: IGetQRcodesUseCase) {}

  public async handle({
    page,
    limit,
    where,
  }: {
    page: number;
    limit: number;
    where: TQRcodesRequestDto;
  }) {
    const { qrCodes, total } = await this.getQRcodesUseCase.execute({
      limit: limit,
      offset: page,
      where: {
        createdBy: {
          eq: where.createdBy,
        },
      },
    });

    // create pagination response object
    const pagination: IPaginationDto<TQRcodeResponseDto> = {
      page: page,
      limit: limit,
      total,
      data: qrCodes,
    };

    // validate and return response
    const response = QRcodePaginationResponseSchema.parse(pagination);
    return response;
  }
}

export default GetQRcodesByController;
