import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Container from "./ui/container";
import { Button, buttonVariants } from "./ui/button";
import Link from "next/link";

export default function Header() {
  return (
    <header className="pt-7">
      <Container>
        <div className="flex justify-between px-6 pt-1 lg:px-8">
          <div className="text-3xl font-bold">
            <Link href="/" title="QRcodly">
              QRcodly
            </Link>
          </div>
          <div>
            <SignedOut>
              <SignInButton>
                <Button>Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex space-x-10">
                <Link href="/dashboard" className={buttonVariants()}>Dashboard</Link>
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      </Container>
    </header>
  );
}
