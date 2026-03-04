import { injectable } from 'tsyringe';
import { type IContentUpdateStrategy } from './content-update-strategy.interface';
import { type TQrCode } from '../../domain/entities/qr-code.entity';

@injectable()
export class DefaultContentUpdateStrategy implements IContentUpdateStrategy {
	supports(): boolean {
		return true;
	}

	async handleContentUpdate(_qrCode: TQrCode, _updates: Partial<TQrCode>): Promise<void> {}
}
