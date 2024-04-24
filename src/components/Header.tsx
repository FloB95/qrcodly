import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Container from "./ui/container";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <header className="pt-7">
      <Container>
        <div className="flex justify-between px-6 lg:px-8 pt-1">
          <div className="text-3xl font-bold">QRcodly</div>
          <div>
            <SignedOut>
              <SignInButton>
                <Button>Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn >
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </Container>
    </header>
  );
}
