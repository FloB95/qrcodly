import Footer from "~/components/Footer";
import Header from "~/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
      <Header hideDashboardLink />
      {children}
      <Footer />
    </main>
  );
}
