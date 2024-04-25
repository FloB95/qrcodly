/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Footer from "~/components/Footer";
import { QRcodeGenerator } from "~/components/qr-generator/QRcodeGenerator";
import Header from "~/components/Header";
import Container from "~/components/ui/container";
import { api } from "~/trpc/server";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      <Header />
      <div>
        <Container>
          <h1 className="mb-10 mt-8 text-center text-4xl font-bold">
            <span className="text-2xl">Free & Open Source</span> <br /> QR Code
            Generator
          </h1>
          <div className="mb-2">
            <QRcodeGenerator />
          </div>
        </Container>
      </div>

      <Footer />
    </main>
  );
}

// TODO remove when you have your own data
// async function CrudShowcase() {
//   const latestPost = await api.post.getLatest();

//   return (
//     <div className="w-full max-w-xs">
//       {latestPost ? (
//         <p className="truncate">Your most recent post: {latestPost.name}</p>
//       ) : (
//         <p>You have no posts yet.</p>
//       )}
//     </div>
//   );
// }