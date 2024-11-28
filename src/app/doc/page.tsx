"use server";

import { openAPI } from "~/server/infrastructure/openAPI";
import "swagger-ui-react/swagger-ui.css";
import Footer from "~/components/Footer";
import Header from "~/components/Header";
import Container from "~/components/ui/container";
import { Swagger } from "~/components/doc/Swagger";

export default async function Documentation() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-orange-100">
        <Header />
        <Container>
          <Swagger swagger={openAPI} />
        </Container>
        <Footer />
      </div>
    </main>
  );
}
