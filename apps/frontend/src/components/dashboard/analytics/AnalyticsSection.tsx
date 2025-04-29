"use client";

import { useGetAnalyticsFromShortCode } from "@/lib/api/url-shortener";
import React from "react";
import { PageAndSessionViewChart } from "./PageAndSessionViewChart";
import { DeviceChart } from "./DeviceChart";

export const AnalyticsSection = ({ shortCode }: { shortCode: string }) => {
	const { isLoading, data } = useGetAnalyticsFromShortCode(shortCode);
	if (isLoading || !data) {
		return;
	}

	return (
		<div className="grid flex-1 scroll-mt-20 items-start gap-10 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:gap-10">
			{data.viewsAndSessions && (
				<>
					<PageAndSessionViewChart chartData={data.viewsAndSessions} />
					<DeviceChart />
				</>
			)}
		</div>
	);
};
