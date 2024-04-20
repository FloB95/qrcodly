import { CreateQRcode } from "~/components/create-qrcode";
import Footer from "~/components/Footer";
import Container from "~/components/ui/container";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      <div>
        <Container>
          <h1 className="my-16 text-center text-4xl font-bold">
            <span className="text-2xl">Free & Open Source</span> <br /> QR Code
            Generator
          </h1>
          <div className="mb-2">
            <CreateQRcode />
          </div>
        </Container>
      </div>

      <Footer />
    </main>
  );
}

// async function CrudShowcase() {
//   const latestPost = await api.post.getLatest();

//   return (
//     <div className="w-full max-w-xs">
//       {latestPost ? (
//         <p className="truncate">Your most recent post: {latestPost.name}</p>
//       ) : (
//         <p>You have no posts yet.</p>
//       )}

//       <CreatePost />
//     </div>
//   );
// }
