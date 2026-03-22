interface GtagEventParams {
	send_to: string;
	value?: number;
	currency?: string;
	[key: string]: unknown;
}

interface Window {
	gtag?: (command: string, action: string, params?: GtagEventParams | string) => void;
}
