"use client";
import { useEffect } from "react";
import Container from "../ui/container";
import { Loader2 } from "lucide-react";

export function ClientRedirect({ destinationUrl }: { destinationUrl: string }) {
	useEffect(() => {
		window.location.replace(destinationUrl);
	}, [destinationUrl]);

	return (
		<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<Container className="flex h-screen flex-col items-center justify-center">
				<Loader2 className="mr-2 h-14 w-14 animate-spin" />{" "}
				<p className="mt-7 text-xl font-semibold">
					Redirecting, please wait...
				</p>
			</Container>
		</main>
	);
}
