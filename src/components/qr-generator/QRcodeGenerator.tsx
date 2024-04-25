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
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { type TQRcodeOptions } from "~/server/domain/entities/QRcode";
import { ContentForm } from "./ContentForm";

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
        <div className="relative mt-4 flex space-x-6">
          <div className="w-16"></div>
          <div className="min-h-[500px] flex-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-12">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1">
                  <TabsContent value="qrCodeContent" className="h-full">
                    <ContentForm
                      qrCodeSettings={qrCodeSettings}
                      onChange={(val: string) =>
                        dispatch({
                          type: "UPDATE_SETTINGS",
                          payload: { data: val },
                        })
                      }
                    />
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
