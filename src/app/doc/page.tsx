"use server";

// import SwaggerUI from "swagger-ui-react";
// import { swagger } from "~/server/infrastructure/swagger";
// import "swagger-ui-react/swagger-ui.css";
import Footer from "~/components/Footer";
import Header from "~/components/Header";
import Container from "~/components/ui/container";

export default async function Documentation() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      {/* <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-orange-100">
        <Header />
        <Container>
          <SwaggerUI spec={swagger} />
        </Container>
        <Footer />
      </div> */}
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
