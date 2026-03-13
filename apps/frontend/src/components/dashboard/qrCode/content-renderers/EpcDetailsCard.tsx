'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TEpcInput } from '@shared/schemas';

interface EpcDetailsCardProps {
	epc: TEpcInput;
}

const formatIban = (iban: string) => {
	return iban
		.replace(/\s/g, '')
		.replace(/(.{4})/g, '$1 ')
		.trim();
};

export const EpcDetailsCard = ({ epc }: EpcDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{epc.name}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
							<BanknotesIcon className="h-4 w-4 text-emerald-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{epc.name}</p>
							<p className="text-xs text-muted-foreground">Bank Transfer (EPC)</p>
						</div>
					</div>
					<Separator />
					<div className="space-y-2">
						<div className="flex items-start justify-between gap-4 text-sm">
							<span className="shrink-0 text-muted-foreground">IBAN</span>
							<span className="truncate text-right font-mono text-xs">{formatIban(epc.iban)}</span>
						</div>
						{epc.bic && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">BIC</span>
								<span className="font-mono text-xs">{epc.bic}</span>
							</div>
						)}
						{epc.amount && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Amount</span>
								<span className="font-semibold">
									{new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
									}).format(epc.amount)}
								</span>
							</div>
						)}
						{epc.purpose && (
							<>
								<Separator />
								<p className="text-sm text-muted-foreground">{epc.purpose}</p>
							</>
						)}
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
