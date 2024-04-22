import Container from "./ui/container";

export default function Header() {
  return (
    <header className="pt-8">
      <Container>
        <div className="flex justify-between">
          <div className="text-3xl font-bold">QRcodly</div>
          <div>Login</div>
        </div>
      </Container>
    </header>
  );
}
