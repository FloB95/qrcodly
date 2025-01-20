"use client";

import { useReducer, Suspense, useState } from "react";
import { SettingsForm } from "./style/SettingsForm";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { DynamicQrCode } from "./DynamicQrCode";
import { PaintBrushIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ContentSwitch } from "./content/ContentSwitch";
import {
  type TUrlInput,
  type TQRcodeOptions,
  type TTextInput,
  type TWifiInput,
  type TVCardInput,
} from "~/server/domain/types/QRcode";
import QrCodeDownloadBtn from "./QrCodeDownloadBtn";
import QrCodeSaveTemplateBtn from "./QrCodeSaveTemplateBtn";

export type TCurrentQrCodeInput =
  | { tab: "url"; value: TUrlInput; editable: boolean }
  | { tab: "text"; value: TTextInput }
  | { tab: "wifi"; value: TWifiInput }
  | { tab: "vCard"; value: TVCardInput };
type QRCodeState = TQRcodeOptions;
type QRCodeAction = { type: string; payload: Partial<TQRcodeOptions> };

function qrCodeReducer(state: QRCodeState, action: QRCodeAction): QRCodeState {
  switch (action.type) {
    case "UPDATE_SETTINGS":
      return {
        ...state,
        ...action.payload,
        qrOptions: { ...state.qrOptions, ...action.payload.qrOptions },
        imageOptions: {
          ...state.imageOptions,
          ...action.payload.imageOptions,
        },
        dotsOptions: { ...state.dotsOptions, ...action.payload.dotsOptions },
        backgroundOptions: {
          ...state.backgroundOptions,
          ...action.payload.backgroundOptions,
        },
        cornersSquareOptions: {
          ...state.cornersSquareOptions,
          ...action.payload.cornersSquareOptions,
        },
        cornersDotOptions: {
          ...state.cornersDotOptions,
          ...action.payload.cornersDotOptions,
        },
      };
    default:
      return state;
  }
}

export const QRcodeGenerator = () => {
  const [qrCodeSettings, dispatch] = useReducer(qrCodeReducer, QrCodeDefaults);
  const [currentInput, setCurrentInput] = useState<TCurrentQrCodeInput>({
    value: "",
    tab: "url",
    editable: false,
  });

  const handleSettingsChange = (settings: Partial<TQRcodeOptions>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  };

  return (
    <>
      <Tabs defaultValue="qrCodeContent">
        <TabsList className="mx-auto grid h-auto max-w-[400px] grid-cols-2 bg-white p-2 shadow">
          <TabsTrigger
            value="qrCodeContent"
            className="data-[state=active]:bg-gray-200"
          >
            <div className="flex space-x-2">
              <QrCodeIcon className="h-6 w-6" />{" "}
              <span className="flex flex-col justify-center">Content</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="qrCodeSettings"
            className="data-[state=active]:bg-gray-200"
          >
            <div className="flex space-x-2">
              <PaintBrushIcon className="h-6 w-6" />{" "}
              <span className="flex flex-col justify-center">Style</span>
            </div>
          </TabsTrigger>
        </TabsList>
        <div className="relative mt-4 flex space-x-6">
          <div className="mx-auto min-h-[500px] max-w-[1200px] flex-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-10">
              <div className="flex flex-col space-y-10 md:flex-row md:space-x-12 md:space-y-0">
                <div className="flex-1">
                  <TabsContent value="qrCodeContent" className="ac mt-0 h-full">
                    <ContentSwitch
                      currentInput={currentInput}
                      setCurrentInput={setCurrentInput}
                      onChange={(val) => {
                        dispatch({
                          type: "UPDATE_SETTINGS",
                          payload: {
                            data: val,
                          },
                        });
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="qrCodeSettings" className="mt-0">
                    <SettingsForm
                      settings={qrCodeSettings}
                      onChange={handleSettingsChange}
                    />
                  </TabsContent>
                </div>
                <div>
                  <Suspense fallback={null}>
                    <div className="flex justify-center space-y-6 md:flex-col md:justify-start">
                      <DynamicQrCode settings={qrCodeSettings} />
                    </div>
                    <div className="mt-6 flex justify-center md:justify-between">
                      <QrCodeSaveTemplateBtn config={qrCodeSettings} />
                      <QrCodeDownloadBtn
                        qrCodeData={{
                          contentType: currentInput.tab,
                          data: currentInput.value,
                        }}
                        qrCodeSettings={qrCodeSettings}
                        saveOnDownload={true}
                      />
                    </div>
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </>
  );
};
