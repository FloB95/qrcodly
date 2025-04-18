"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Paintbrush } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type ColorStop = {
  offset: number;
  color: string;
};

type Gradient = {
  type: "radial" | "linear";
  rotation: number;
  colorStops: ColorStop[];
};

type BackgroundType = string | Gradient;

interface ColorPickerProps {
  defaultBackground?: BackgroundType;
  onChange: (background: BackgroundType) => void;
  className?: string;
  withGradient?: boolean;
}

const backgroundToButtonText = (background: BackgroundType): string => {
  if (typeof background === "string") return background;
  const colorStopsStr = background.colorStops
    .map((stop) => `${stop.color}`)
    .join(" -> ");
  return `${colorStopsStr}`;
};

export function ColorPicker({
  defaultBackground,
  onChange,
  className,
  withGradient = true,
}: ColorPickerProps) {
  const solids = [
    "#E2E2E2",
    "#ff75c3",
    "#ffa647",
    "#ffe83f",
    "#9fff5b",
    "#70e2ff",
    "#cd93ff",
    "#09203f",
  ];

  const gradients = [
    ["#accbee", "#e7f0fd"],
    ["#000000", "#434343"],
    ["#09203f", "#537895"],
    ["#f953c6", "#b91d73"],
    ["#ee0979", "#ff6a00"],
    ["#F00000", "#DC281E"],
    ["#00c6ff", "#0072ff"],
    ["#4facfe", "#00f2fe"],
  ];

  const [internalBackground, setInternalBackground] = useState<BackgroundType>(
    defaultBackground ?? "#000000",
  );
  const [rotation, setRotation] = useState<number>(90);
  const [gradientColors, setGradientColors] = useState<[string, string]>([
    "#accbee",
    "#e7f0fd",
  ]);

  const defaultTab = useMemo(() => {
    if (typeof internalBackground === "object") return "gradient";
    return "solid";
  }, [internalBackground]);

  const backgroundToStyle = useCallback(
    (background: BackgroundType): string => {
      if (typeof background === "string") return background;
      const gradientType =
        background.type === "radial" ? "radial-gradient" : "linear-gradient";
      const rotationStr =
        background.type === "linear" ? `${background.rotation}deg, ` : "";
      const colorStopsStr = background.colorStops
        .map((stop) => `${stop.color} ${stop.offset * 100}%`)
        .join(", ");
      return `${gradientType}(${rotationStr}${colorStopsStr})`;
    },
    [],
  );

  const [debouncedInternalBackground] = useDebouncedValue(
    internalBackground,
    100,
  );

  useEffect(() => {
    if (defaultBackground === debouncedInternalBackground) return;
    onChange(debouncedInternalBackground);
  }, [debouncedInternalBackground]);

  const handleSolidColorSelect = useCallback((color: string) => {
    setInternalBackground(color);
  }, []);

  const handleGradientPresetSelect = useCallback(
    (colors: [string, string]) => {
      setGradientColors(colors);
      setInternalBackground({
        type: "linear",
        rotation,
        colorStops: [
          { offset: 0, color: colors[0] },
          { offset: 1, color: colors[1] },
        ],
      });
    },
    [rotation],
  );

  const handleRotationChange = useCallback(
    (newRotation: number) => {
      setRotation(newRotation);
      if (
        typeof internalBackground === "object" &&
        internalBackground.type === "linear"
      ) {
        setInternalBackground({
          ...internalBackground,
          rotation: newRotation,
        });
      }
    },
    [internalBackground],
  );

  const handleGradientColorChange = useCallback(
    (index: 0 | 1, color: string) => {
      const newGradientColors = [...gradientColors];
      newGradientColors[index] = color;
      setGradientColors(newGradientColors as [string, string]);

      if (typeof internalBackground === "object") {
        const newColorStops = [...internalBackground.colorStops];
        newColorStops[index] = {
          ...newColorStops[index],
          color,
          offset: newColorStops[index]?.offset ?? 0, // Ensure offset is defined
        };
        setInternalBackground({
          ...internalBackground,
          colorStops: newColorStops,
        });
      } else {
        setInternalBackground({
          type: "linear",
          rotation,
          colorStops: [
            { offset: 0, color: newGradientColors[0]! },
            { offset: 1, color: newGradientColors[1]! },
          ],
        });
      }
    },
    [internalBackground, rotation, gradientColors],
  );

  const handleSolidInputChange = useCallback((color: string) => {
    setInternalBackground(color);
  }, []);

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[220px] justify-start text-left font-normal",
            !internalBackground && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex w-full items-center gap-2">
            {internalBackground ? (
              <div
                className="h-4 w-4 rounded !bg-cover !bg-center transition-all"
                style={{ background: backgroundToStyle(internalBackground) }}
              ></div>
            ) : (
              <Paintbrush className="h-4 w-4" />
            )}
            <div className="flex-1 truncate">
              {internalBackground
                ? backgroundToButtonText(internalBackground)
                : "Pick a color"}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" sideOffset={10}>
        <Tabs
          defaultValue={defaultTab}
          className="relative w-full"
          onValueChange={(value) => {
            // Reset gradient colors when switching to solid tab
            if (value === "solid" && typeof internalBackground === "object") {
              setGradientColors([
                internalBackground.colorStops[0]?.color ?? "#000000",
                internalBackground.colorStops[1]?.color ?? "#ffffff",
              ]);
            }
          }}
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger className="flex-1" value="solid">
              Solid
            </TabsTrigger>
            {withGradient && (
              <TabsTrigger className="flex-1" value="gradient">
                Gradient
              </TabsTrigger>
            )}
          </TabsList>

          {/* Solid Color Tab */}
          <TabsContent value="solid" className="mt-0 flex flex-wrap gap-1">
            {solids.map((s) => (
              <div
                key={s}
                style={{ background: s }}
                className="h-6 w-6 cursor-pointer rounded-md active:scale-105"
                onClick={() => handleSolidColorSelect(s)}
              />
            ))}

            <div className="w-full">
              <Input
                type="color"
                value={
                  typeof internalBackground === "string"
                    ? internalBackground
                    : gradientColors[0]
                } // Show current solid or first gradient color
                className="mt-4 h-8 cursor-pointer p-1"
                onChange={(e) => handleSolidInputChange(e.currentTarget.value)}
              />
            </div>
          </TabsContent>

          {/* Gradient Tab */}
          {withGradient && (
            <TabsContent value="gradient" className="mt-0">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Gradient Rotation: {rotation}°
                </label>
                <Slider
                  defaultValue={[rotation]}
                  max={360}
                  step={1}
                  onValueChange={(e: unknown) =>
                    handleRotationChange(e as number)
                  }
                />
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {gradients.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: `linear-gradient(${rotation}deg, ${s.join(", ")})`,
                    }}
                    className="h-6 w-6 cursor-pointer rounded-md active:scale-105"
                    onClick={() =>
                      handleGradientPresetSelect(s as [string, string])
                    }
                  />
                ))}
              </div>
              <div className="flex space-x-1">
                <Input
                  type="color"
                  className="p-1"
                  value={gradientColors[0]}
                  onChange={(e) => handleGradientColorChange(0, e.target.value)}
                />
                <Input
                  type="color"
                  className="p-1"
                  value={gradientColors[1]}
                  onChange={(e) => handleGradientColorChange(1, e.target.value)}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
