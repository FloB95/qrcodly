import { CustomApiError } from './custom-api.error';

export class PaymentRequiredError extends CustomApiError {
	constructor(message = 'The payment could not be collected. Please check your payment method.') {
		super(message, 402);
	}
}
