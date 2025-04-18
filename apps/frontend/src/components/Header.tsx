import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Container from "./ui/container";
import { Button, buttonVariants } from "./ui/button";
import Link from "next/link";

export default function Header({ hideDashboardLink = false }) {
  return (
    <header className="pt-10">
      <Container>
        <div className="flex justify-between pt-1 sm:px-6 lg:px-8">
          <div className="text-3xl font-bold">
            <Link href="/" title="QRcodly">
              QRcodly
            </Link>
          </div>
          <div className="flex space-x-4 sm:space-x-6">
            <Link href="/doc" className="hidden h-10 px-2 py-2 sm:block">
              API
            </Link>
            <SignedOut>
              <SignInButton>
                <Button>Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              {!hideDashboardLink && (
                <Link href="/dashboard" className={buttonVariants()}>
                  Dashboard
                </Link>
              )}
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </Container>
    </header>
  );
}
