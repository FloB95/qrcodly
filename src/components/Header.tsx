import Container from "./ui/container";

export default function Header() {
  return (
    <header className="pt-8">
      <Container>
        <div className="flex justify-between px-6 lg:px-8">
          <div className="text-3xl font-bold">QRcodly</div>
          <div>Login</div>
        </div>
      </Container>
    </header>
  );
}