import QrCode from "~/components/qr-generator/QrCode";
import { api } from "~/lib/trpc/server";

export default async function Dashboard() {
  const myQRcodes = await api.qrCode.getMyQrCodes();
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
      <h1 className="text-4xl font-bold my-16">Dashboard is in development</h1>
      {myQRcodes.map((qr) => (
        <div key={qr.id} className="flex space-x-4">
          <div>
            <p>{qr.config.data}</p>
          </div>
          <QrCode settings={qr.config} />
        </div>
      ))}
    </div>
  );
}
