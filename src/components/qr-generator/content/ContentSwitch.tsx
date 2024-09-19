/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { buttonVariants } from "~/components/ui/button";
import {
  DocumentTextIcon,
  LinkIcon,
  WifiIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UrlSection } from "./UrlSection";
import { TextSection } from "./TextSection";
import { type TCurrentQrCodeInput } from "../QRcodeGenerator";
import {
  type TQrCodeContentOriginalData,
  VCardInputSchema,
  WifiInputSchema,
  type TQRcodeOptions,
} from "~/server/domain/types/QRcode";
import { VcardSection } from "./VcardSection";
import { convertVCardObjToString, convertWiFiObjToString } from "~/lib/utils";
import { WiFiSection } from "./WiFiSection";

type TContentSwitchProps = {
  currentInput: TCurrentQrCodeInput;
  setCurrentInput: (input: TCurrentQrCodeInput) => void;
  onChange: (
    v: string,
    originalVal: TQrCodeContentOriginalData,
    contentType: TQRcodeOptions["contentType"],
  ) => void;
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
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start space-x-3 bg-transparent p-0">
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
          <TabsTrigger value="wifi" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
              })}
            >
              <WifiIcon className="mr-2 h-6 w-6" /> WIFI
            </button>
          </TabsTrigger>
          <TabsTrigger value="vCard" asChild>
            <button
              className={buttonVariants({
                variant: "tab",
              })}
            >
              <IdentificationIcon className="mr-2 h-6 w-6" /> VCARD
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
              onChange(url, url, { type: "url", editable });
            }}
          />
        </TabsContent>
        <TabsContent value="text" className="h-full">
          <TextSection
            value={currentInput.tab === "text" ? currentInput.value : ""}
            onChange={(v) => {
              if (currentInput.tab !== "text") return;
              setCurrentInput({ ...currentInput, value: v });
              onChange(v, v, { type: "text" });
            }}
          />
        </TabsContent>
        <TabsContent value="wifi">
          <WiFiSection
            value={
              currentInput.tab === "wifi"
                ? WifiInputSchema.safeParse(currentInput.value).data!
                : WifiInputSchema.safeParse({}).data!
            }
            onChange={(v) => {
              if (currentInput.tab !== "wifi") return;
              setCurrentInput({ ...currentInput, value: v });
              onChange(convertWiFiObjToString(v), v, { type: "wifi" });
            }}
          />
        </TabsContent>
        <TabsContent value="vCard">
          <VcardSection
            value={
              currentInput.tab === "vCard"
                ? VCardInputSchema.safeParse(currentInput.value).data!
                : VCardInputSchema.safeParse({}).data!
            }
            onChange={(v) => {
              if (currentInput.tab !== "vCard") return;
              setCurrentInput({ ...currentInput, value: v });
              onChange(convertVCardObjToString(v), v, { type: "vCard" });
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};
