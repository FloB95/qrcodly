"use client";

import { useGetAnalyticsFromShortCode } from "@/lib/api/url-shortener";
import React from "react";
import { PageAndSessionViewChart } from "./PageAndSessionViewChart";

export const AnalyticsSection = ({ shortCode }: { shortCode: string }) => {
	const { isLoading, data } = useGetAnalyticsFromShortCode(shortCode);
	console.log("isLoading", isLoading);
	console.log("data", data);

	if (isLoading || !data) {
		return;
	}

	return (
		<div>
			{data.viewsAndSessions && (
				<PageAndSessionViewChart chartData={data.viewsAndSessions} />
			)}
		</div>
	);
};
