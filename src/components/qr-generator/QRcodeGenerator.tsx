"use client";

import { useReducer, Suspense } from "react";
import { Input } from "~/components/ui/input";
import { SettingsForm } from "./SettingsForm";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { DynamicQrCode } from "./DynamicQrCode";
import {
  LinkIcon,
  DocumentTextIcon,
  WifiIcon,
  PaintBrushIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { type TQRcodeOptions } from "~/server/domain/entities/QRcode";

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

  const handleSettingsChange = (settings: Partial<TQRcodeOptions>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  };

  return (
    <>
      <Tabs defaultValue="qrCodeContent">
        <TabsList className="mx-auto grid h-auto w-[400px] grid-cols-2 bg-white p-2">
          <TabsTrigger
            value="qrCodeContent"
            className=" data-[state=active]:bg-gray-200"
          >
            <div className="flex space-x-2">
              <QrCodeIcon className="h-6 w-6" />{" "}
              <span className="flex flex-col justify-center">Content</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="qrCodeSettings"
            className=" data-[state=active]:bg-gray-200"
          >
            <div className="flex space-x-2">
              <PaintBrushIcon className="h-6 w-6" />{" "}
              <span className="flex flex-col justify-center">Style</span>
            </div>
          </TabsTrigger>
        </TabsList>
        <div className="mt-4 flex space-x-6">
          <div className="flex flex-col justify-center">
            <div className="flex flex-col space-y-2">
              <Button size={"icon"}>
                <LinkIcon className="h-6 w-6 text-white" />
              </Button>
              <Button size={"icon"} variant={"white"} disabled>
                <DocumentTextIcon className="h-6 w-6" />
              </Button>
              <Button size={"icon"} variant={"white"} disabled>
                <WifiIcon className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <div className="min-h-[500px] flex-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-12">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1">
                  <TabsContent value="qrCodeContent" className="h-full">
                    <div className="flex h-full flex-1 flex-col">
                      <p className="mb-4 text-xl font-semibold">
                        Enter your URL here
                      </p>
                      <Input
                        className="max-w-[650px] p-6"
                        placeholder="Enter Text or URL https://example.com/"
                        value={qrCodeSettings.data}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { data: e.target.value },
                          })
                        }
                        autoFocus
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="qrCodeSettings">
                    <SettingsForm
                      settings={qrCodeSettings}
                      onChange={handleSettingsChange}
                    />
                  </TabsContent>
                </div>
                <div>
                  <Suspense fallback={null}>
                    <DynamicQrCode settings={qrCodeSettings} />
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
