import { CreatePost } from "~/components/create-post";
import { CreateQRcode } from "~/components/create-qrcode";
import Container from "~/components/ui/container";
import { api } from "~/trpc/server";

export default async function Home() {
  return (
    <main className="min-h-screen justify-center bg-gradient-to-br from-zinc-50 to-orange-100">
      <div className="flex py-2"></div>

      <Container>
        <h1 className="mt-10 text-4xl font-bold">Generate your QR Code</h1>
        <div className="mt-10">
          <CreateQRcode />
        </div>
      </Container>
    </main>
  );
}

async function CrudShowcase() {
  const latestPost = await api.post.getLatest();

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}

      <CreatePost />
    </div>
  );
}
