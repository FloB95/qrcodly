"use client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Paintbrush } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "~/lib/utils";

export function ColorPicker({
  background,
  setBackground,
  className,
}: {
  background: string[];
  setBackground: (background: string[]) => void;
  className?: string;
}) {
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

  // const gradients = [
  //   ["#accbee", "#e7f0fd"],
  //   ["#000000", "#434343"],
  //   ["#09203f", "#537895"],
  //   ["#f953c6", "#b91d73"],
  //   ["#ee0979", "#ff6a00"],
  //   ["#F00000", "#DC281E"],
  //   ["#00c6ff", "#0072ff"],
  //   ["#4facfe", "#00f2fe"],
  // ];

  const defaultTab = useMemo(() => {
    if (background.length > 1) return "gradient";
    return "solid";
  }, [background]);

  const backgroundToStyle = useCallback((background: string[]) => {
    if (background.length === 1) return background[0];
    return `linear-gradient(to top left, ${background.join(", ")})`;
  }, []);

  const [currentTab, setCurrentTab] = useState(defaultTab);

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[220px] justify-start text-left font-normal",
            !background && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex w-full items-center gap-2">
            {background ? (
              <div
                className="h-4 w-4 rounded !bg-cover !bg-center transition-all"
                style={{ background: backgroundToStyle(background) }}
              ></div>
            ) : (
              <Paintbrush className="h-4 w-4" />
            )}
            <div className="flex-1 truncate">
              {background ? background : "Pick a color"}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" sideOffset={10}>
        <Tabs
          defaultValue={defaultTab}
          className="w-full relative"
          onValueChange={setCurrentTab}
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger className="flex-1" value="solid">
              Solid
            </TabsTrigger>
            {/* <TabsTrigger className="flex-1" value="gradient">
              Gradient
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="solid" className="mt-0 flex flex-wrap gap-1">
            {solids.map((s) => (
              <div
                key={s}
                style={{ background: s }}
                className="h-6 w-6 cursor-pointer rounded-md active:scale-105"
                onClick={() => setBackground([s])}
              />
            ))}
          </TabsContent>

          {/* <TabsContent value="gradient" className="mt-0">
            <div className="mb-2 flex flex-wrap gap-1">
              {gradients.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: `linear-gradient(to top left, ${s.join(", ")})`,
                  }}
                  className="h-6 w-6 cursor-pointer rounded-md active:scale-105"
                  onClick={() => setBackground(s)}
                />
              ))}
            </div>
          </TabsContent> */}

          <TabsContent value="password">Change your password here.</TabsContent>
        </Tabs>

        <div className="flex space-x-2">
          <Input
            type="color"
            value={background[0]}
            className="mt-4 h-8 cursor-pointer p-1"
            onChange={(e) => {
              const newB =
                background.length === 1
                  ? [e.currentTarget.value]
                  : ([e.currentTarget.value, background[1]] as string[]);
              setBackground(newB);
            }}
          />
          {currentTab === "gradient" && (
            <Input
              type="color"
              value={background[1] ?? ""}
              className="mt-4 h-8 cursor-pointer p-1"
              onChange={(e) => {
                const newB = [background[0], e.currentTarget.value] as string[];
                setBackground(newB);
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
