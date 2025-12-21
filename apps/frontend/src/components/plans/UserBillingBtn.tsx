'use client';
import React from 'react';
import { Button } from '../ui/button';
import { useClerk } from '@clerk/nextjs';

export const UserBillingBtn = () => {
	const { openUserProfile } = useClerk();

	return (
		<Button
			variant="secondary"
			onClick={() =>
				openUserProfile({
					__experimental_startPath: '/billing',
				})
			}
		>
			Manage Subscription
		</Button>
	);
};
