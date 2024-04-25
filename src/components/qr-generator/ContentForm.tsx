import { Input } from "../ui/input";
import { type TQRcodeOptions } from "~/server/domain/entities/QRcode";
import { buttonVariants } from "../ui/button";
import {
  DocumentTextIcon,
  LinkIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "../ui/textarea";

type TContentFormProps = {
  qrCodeSettings: TQRcodeOptions;
  onChange: (e: string) => void;
};

export const ContentForm = ({
  qrCodeSettings,
  onChange,
}: TContentFormProps) => {
  return (
    <>
      <Tabs defaultValue="url" className="h-full" suppressHydrationWarning>
        <TabsList className="absolute bottom-0 left-0 top-0 flex  h-full flex-col space-y-2 bg-transparent">
          <TabsTrigger value="url" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
                size: "icon",
              })}
            >
              <LinkIcon className="h-6 w-6" />
            </button>
          </TabsTrigger>
          <TabsTrigger value="text" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
                size: "icon",
              })}
            >
              <DocumentTextIcon className="h-6 w-6" />
            </button>
          </TabsTrigger>
          <TabsTrigger value="wifi" disabled asChild>
            <button
              className={buttonVariants({
                variant: "tab",
                size: "icon",
              })}
            >
              <WifiIcon className="h-6 w-6" />
            </button>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="url">
          <div className="flex h-full flex-1 flex-col">
            <p className="mb-4 text-xl font-semibold">Enter your URL here</p>
            <Input
              className="max-w-[650px] p-6"
              placeholder="Enter Text or URL https://example.com/"
              value={qrCodeSettings.data}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
        </TabsContent>
        <TabsContent value="text" className="h-full">
          <div className="flex h-full flex-1 flex-col">
            <p className="mb-4 text-xl font-semibold">Enter your Text here</p>
            <Textarea
              className="h-full max-w-[650px] p-6"
              placeholder="Enter your Text..."
              value={qrCodeSettings.data}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </TabsContent>
        <TabsContent value="wifi">
          <div className="flex h-full flex-1 flex-col">
            <p className="mb-4 text-xl font-semibold">Enter your URL here</p>
            <Input
              className="max-w-[650px] p-6"
              placeholder="Enter Text or URL https://example.com/"
              value={qrCodeSettings.data}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
