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

type TContentFormProps = {
  currentInput: TCurrentQrCodeInput;
  setCurrentInput: (input: TCurrentQrCodeInput) => void;
  onChange: (e: string) => void;
};

export const ContentForm = ({
  currentInput,
  setCurrentInput,
  onChange,
}: TContentFormProps) => {
  return (
    <>
      <Tabs
        defaultValue={currentInput.tab}
        className="max-w-[650px]"
        suppressHydrationWarning
        onValueChange={(value: any) => {
          setCurrentInput({ value: "", tab: value });
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
            onChange={(e) => {
              if (currentInput.tab !== "url") return;
              setCurrentInput({ ...currentInput, value: e });
              onChange(e);
            }}
          />
        </TabsContent>
        <TabsContent value="text" className="h-full">
          <TextSection
            value={currentInput.tab === "text" ? currentInput.value : ""}
            onChange={(e) => {
              if (currentInput.tab !== "text") return;
              setCurrentInput({ ...currentInput, value: e });
              onChange(e);
            }}
          />
        </TabsContent>
        <TabsContent value="wifi"></TabsContent>
      </Tabs>
    </>
  );
};