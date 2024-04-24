"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Input } from "./ui/input";
import { SettingsForm } from "./generator/SettingsForm";
import {
  type DrawType,
  type TypeNumber,
  type Mode,
  type ErrorCorrectionLevel,
  type DotType,
  type CornerSquareType,
  type CornerDotType,
  type Options,
} from "qr-code-styling";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { QrCodeSkeleton } from "./generator/QrCodeSkeleton";

const QrCode = dynamic(() => import("./generator/QrCode"), {
  ssr: false,
  loading: () => <QrCodeSkeleton />,
});

export const CreateQRcode = () => {
  const [qrCodeSettings, setQrCodeSettings] = useState<Options>({
    width: 1000,
    height: 1000,
    type: "canvas" as DrawType,
    data: "",
    image: "",
    margin: 0,
    qrOptions: {
      typeNumber: 0 as TypeNumber,
      mode: "Byte" as Mode,
      errorCorrectionLevel: "Q" as ErrorCorrectionLevel,
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 20,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: "#000000",
      // gradient: {
      //   type: 'linear', // 'radial'
      //   rotation: 0,
      //   colorStops: [{ offset: 0, color: '#8688B2' }, { offset: 1, color: '#77779C' }]
      // },
      type: "rounded" as DotType,
    },
    backgroundOptions: {
      color: "#ffffff",
      // gradient: {
      //   type: 'linear', // 'radial'
      //   rotation: 0,
      //   colorStops: [{ offset: 0, color: '#ededff' }, { offset: 1, color: '#e6e7ff' }]
      // },
    },
    cornersSquareOptions: {
      color: "#000000",
      type: "extra-rounded" as CornerSquareType,
      // gradient: {
      //   type: 'linear', // 'radial'
      //   rotation: 180,
      //   colorStops: [{ offset: 0, color: '#25456e' }, { offset: 1, color: '#4267b2' }]
      // },
    },
    cornersDotOptions: {
      color: "#000000",
      type: "dot" as CornerDotType,
      // gradient: {
      //   type: 'linear', // 'radial'
      //   rotation: 180,
      //   colorStops: [{ offset: 0, color: '#00266e' }, { offset: 1, color: '#4060b3' }]
      // },
    },
  });

  return (
    <>
      <Input
        className="mx-auto max-w-[650px] p-6"
        placeholder="Enter Text or URL https://example.com/"
        value={qrCodeSettings.data}
        onChange={(e) => {
          setQrCodeSettings((prev) => ({
            ...prev,
            data: e.target.value,
          }));
        }}
        autoFocus
      />
      <div className="mt-12 min-h-[500px] divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1">
              <SettingsForm
                settings={qrCodeSettings}
                onChange={(d) => {
                  console.log("d",d)
                  // merge the new settings with the old settings
                  setQrCodeSettings((prev) => ({
                    ...prev,
                    ...d,
                    qrOptions: {
                      ...prev.qrOptions,
                      ...d.qrOptions,
                    },
                    imageOptions: {
                      ...prev.imageOptions,
                      ...d.imageOptions,
                    },
                    dotsOptions: {
                      ...prev.dotsOptions,
                      ...d.dotsOptions,
                    },
                    backgroundOptions: {
                      ...prev.backgroundOptions,
                      ...d.backgroundOptions,
                    },
                    cornersSquareOptions: {
                      ...prev.cornersSquareOptions,
                      ...d.cornersSquareOptions,
                    },
                    cornersDotOptions: {
                      ...prev.cornersDotOptions,
                      ...d.cornersDotOptions,
                    },
                  }));
                }}
              />
            </div>
            <div>
              <Suspense fallback={null}>
                <QrCode settings={qrCodeSettings} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
