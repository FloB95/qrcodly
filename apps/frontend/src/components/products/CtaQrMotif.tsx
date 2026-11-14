import { BrandQr } from '@/components/products/mockups/BrandQr';

/** A faint QR code bleeding off the right edge of a CTA banner; colour follows the banner text */
export function CtaQrMotif() {
	return (
		<BrandQr className="pointer-events-none absolute top-1/2 -right-14 hidden size-[360px] -translate-y-1/2 opacity-[0.07] [mask-image:linear-gradient(to_left,black_35%,transparent_85%)] md:block" />
	);
}
