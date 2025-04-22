import { apiRequest } from "@/lib/utils";
import type { TShortUrl } from "@shared/schemas";
import { permanentRedirect, redirect, RedirectType } from "next/navigation";
import posthog from "posthog-js";

interface Props {
	params: Promise<{
		urlCode: string;
	}>;
}

export default async function RedirectPage({ params }: Props) {
	const { urlCode } = await params;

	let shortUrl: TShortUrl;
	try {
		const response = await apiRequest<TShortUrl>(`/short-url/${urlCode}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response?.destinationUrl) {
			console.error(
				`Short URL data missing or invalid for code: ${urlCode}`,
				response,
			);
			redirect("/404");
		}

		shortUrl = response;
	} catch (error) {
		console.error("Error fetching short URL:", error);
		redirect("/404");
	}

	posthog.capture("short-url-redirect", {
		url_code: shortUrl.shortCode,
		destination_url: shortUrl.destinationUrl,
	});
	permanentRedirect(shortUrl.destinationUrl!, RedirectType.replace);
}
