'use client';

import { useUser } from '@clerk/nextjs';
import { usePaymentElement, PaymentElement } from '@clerk/nextjs/experimental';
import { useState } from 'react';

export function AddPaymentMethodForm() {
	const { user } = useUser();
	const { submit, isFormReady } = usePaymentElement();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAddPaymentMethod = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isFormReady || !user) {
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			// 1. Submit the form to the payment provider to get a payment token
			const { error } = await submit();

			// Usually a validation error from stripe that you can ignore.
			if (error) {
				setError(error.error.message || 'Payment validation failed. Please check your details.');
				setIsSubmitting(false);
				return;
			}

			// 2. Use the token to add the payment source to the user
			// await user.addPaymentSource(data);

			// 3. Handle success (e.g., show a confirmation, clear the form)
			alert('Payment method added successfully!');
		} catch (err: any) {
			setError(err.message || 'An unexpected error occurred.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleAddPaymentMethod}>
			<h3>Add a new payment method</h3>
			<PaymentElement />
			<button type="submit" disabled={!isFormReady || isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save Card'}
			</button>
			{error && <p style={{ color: 'red' }}>{error}</p>}
		</form>
	);
}
