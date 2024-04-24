"use client";

import { useReducer, Suspense } from "react";
import { Input } from "~/components/ui/input";
import { SettingsForm } from "./SettingsForm";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { type Options } from "qr-code-styling";
import { DynamicQrCode } from "./DynamicQrCode";

type QRCodeState = Options;
type QRCodeAction = { type: string; payload: Partial<Options> };

function qrCodeReducer(state: QRCodeState, action: QRCodeAction): QRCodeState {
  switch (action.type) {
    case "UPDATE_SETTINGS":
      return {
        ...state,
        ...action.payload,
        qrOptions: { ...state.qrOptions, ...action.payload.qrOptions },
        imageOptions: { ...state.imageOptions, ...action.payload.imageOptions },
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

  const handleSettingsChange = (settings: Partial<Options>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  };

  return (
    <>
      <Input
        className="mx-auto max-w-[650px] p-6"
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
      <div className="mt-12 min-h-[500px] divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1">
              <SettingsForm
                settings={qrCodeSettings}
                onChange={handleSettingsChange}
              />
            </div>
            <div>
              <Suspense fallback={null}>
                <DynamicQrCode settings={qrCodeSettings} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
