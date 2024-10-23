import Footer from "~/components/Footer";
import Header from "~/components/Header";
import Container from "~/components/ui/container";

export default function Documentation() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      <Header />
      <div>
        <Container>
          <h1 className="mb-10 mt-8 text-center text-4xl font-bold">
            Coming soon!
          </h1>
        </Container>
      </div>
      <Footer />
    </main>
  );
}
