import type {
	TQrCodeWithRelationsResponseDto,
	TQrCodeOptions,
	TQrCodeContent,
} from '@shared/schemas';

/**
 * Discriminated union for different QR code usage modes
 */
export type QrCodeMode =
	| {
			mode: 'saved';
			qrCode: TQrCodeWithRelationsResponseDto;
	  }
	| {
			mode: 'generator';
			// Uses context store for everything
	  }
	| {
			mode: 'editor';
			initialQrCode: TQrCodeWithRelationsResponseDto;
			// Uses context store for current state
	  };

/**
 * Props for rendering a QR code (without download functionality)
 */
export type QrCodeRenderData =
	| {
			source: 'saved';
			qrCode: TQrCodeWithRelationsResponseDto;
	  }
	| {
			source: 'context';
			config: TQrCodeOptions;
			content: TQrCodeContent;
			shortUrl?: import('@shared/schemas').TShortUrl;
	  };
