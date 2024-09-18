import { QrCodeList } from "~/components/dashboard/QrCodeList";

export default function Dashboard() {
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
      <h1 className="my-16 text-4xl font-bold">
        Dashboard is in development 🚀
      </h1>
      <QrCodeList />
    </div>
  );
}
