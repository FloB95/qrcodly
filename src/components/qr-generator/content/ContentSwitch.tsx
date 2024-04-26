/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { buttonVariants } from "~/components/ui/button";
import {
  DocumentTextIcon,
  LinkIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UrlSection } from "./UrlSection";
import { TextSection } from "./TextSection";
import { type TCurrentQrCodeInput } from "../QRcodeGenerator";
import { type TQRcodeOptions } from "~/server/domain/types/QRcode";

type TContentSwitchProps = {
  currentInput: TCurrentQrCodeInput;
  setCurrentInput: (input: TCurrentQrCodeInput) => void;
  onChange: (e: string, contentType: TQRcodeOptions["contentType"]) => void;
};

export const ContentSwitch = ({
  currentInput,
  setCurrentInput,
  onChange,
}: TContentSwitchProps) => {
  return (
    <>
      <Tabs
        defaultValue={currentInput.tab}
        className="max-w-[650px]"
        suppressHydrationWarning
        onValueChange={(value: any) => {
          setCurrentInput({ value: "", tab: value, editable: false });
        }}
      >
        <TabsList className="mb-6 flex justify-start space-x-3 bg-transparent p-0">
          <TabsTrigger value="url" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
              })}
            >
              <LinkIcon className="mr-2 h-6 w-6" /> URL
            </button>
          </TabsTrigger>
          <TabsTrigger value="text" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
              })}
            >
              <DocumentTextIcon className="mr-2 h-6 w-6" /> TEXT
            </button>
          </TabsTrigger>
          <TabsTrigger value="wifi" disabled asChild>
            <button
              className={buttonVariants({
                variant: "tab",
              })}
            >
              <WifiIcon className="mr-2 h-6 w-6" /> WIFI
            </button>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="url">
          <UrlSection
            value={currentInput.tab === "url" ? currentInput.value : ""}
            editable={
              currentInput.tab === "url" ? currentInput.editable : false
            }
            onChange={(url, editable) => {
              if (currentInput.tab !== "url") return;
              setCurrentInput({ ...currentInput, value: url, editable });
              onChange(url, { type: "url", editable });
            }}
          />
        </TabsContent>
        <TabsContent value="text" className="h-full">
          <TextSection
            value={currentInput.tab === "text" ? currentInput.value : ""}
            onChange={(e) => {
              if (currentInput.tab !== "text") return;
              setCurrentInput({ ...currentInput, value: e });
              onChange(e, { type: "text" });
            }}
          />
        </TabsContent>
        <TabsContent value="wifi"></TabsContent>
      </Tabs>
    </>
  );
};
