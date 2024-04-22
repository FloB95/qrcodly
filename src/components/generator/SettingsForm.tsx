/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";

import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { type Options } from "qr-code-styling";
import { ColorPicker } from "./ColorPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Slider } from "../ui/slider";

type SettingsFormProps = {
  onChange: (data: Options) => void;
  settings: Options;
};

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const form = useForm({
    defaultValues: {
      width: settings?.width ?? 300,
      height: settings?.height ?? 300,
      margin: settings?.margin ?? 0,
      dotStyle: settings?.dotsOptions?.type ?? "rounded",
      cornersSquareStyle:
        settings?.cornersSquareOptions?.type ?? "extra-rounded",
      cornersDotStyle: settings?.cornersDotOptions?.type ?? "dot",
      background: settings?.backgroundOptions?.color ?? "#ffffff",
      hideBackgroundDots: settings?.imageOptions?.hideBackgroundDots ?? true,
      imageSize: settings?.imageOptions?.imageSize ?? 0.4,
      imageMargin: settings?.imageOptions?.margin ?? 0,
    },
  });

  const handleChange = (data: any) => {
    // map form data with settings
    settings.width = Number(data.width);
    settings.height = Number(data.height);
    if (typeof settings.margin !== "undefined")
      settings.margin = Number(data.margin);
    if (settings.dotsOptions) settings.dotsOptions.type = data.dotStyle;
    if (settings.cornersSquareOptions)
      settings.cornersSquareOptions.type = data.cornersSquareStyle;
    if (settings.cornersDotOptions)
      settings.cornersDotOptions.type = data.cornersDotStyle;
    if (settings.backgroundOptions)
      settings.backgroundOptions.color = data.background;
    if (settings.imageOptions)
      settings.imageOptions.hideBackgroundDots = data.hideBackgroundDots;
    if (settings.imageOptions)
      settings.imageOptions.imageSize = Number(data.imageSize);
    if (settings.imageOptions)
      settings.imageOptions.margin = Number(data.imageMargin);
    onChange(settings);
  };

  return (
    <Form {...form}>
      <form
        onChange={form.handleSubmit(handleChange)}
        className="xl:w-2/3 space-y-6"
      >
        <Tabs defaultValue={"general"} className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger className="flex-1" value="general">
              General Settings
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="dot">
              Dot Settings
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="image">
              Image Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (Quality)</FormLabel>
                    <FormControl>
                      <Slider
                        className="cursor-pointer"
                        value={[form.getValues("width")]}
                        max={2000}
                        min={300}
                        step={25}
                        onValueChange={(e: any) => {
                          form.setValue("width", e);
                          form.setValue("height", e);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="mt-3 text-center">
                        {form.getValues("height")} x {form.getValues("width")}{" "}
                        px
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="margin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margin</FormLabel>
                    <FormControl>
                      <Slider
                        className="cursor-pointer"
                        value={[field.value]}
                        max={300}
                        min={0}
                        step={10}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="mt-3 text-center">{field.value} px</div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="background"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Background</FormLabel>
                      <FormControl>
                        <div>
                          <ColorPicker
                            background={field.value}
                            setBackground={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="dot" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="dotStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dot Style</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="dots">Dots</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="extra-rounded">
                            Extra rounded
                          </SelectItem>
                          <SelectItem value="classy">Classy</SelectItem>
                          <SelectItem value="classy-rounded">
                            Classy rounded
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cornersSquareStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corners Square Style</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="dot">Dot</SelectItem>
                          <SelectItem value="extra-rounded">
                            Extra rounded
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cornersDotStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corners Dot Style</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="dot">Dot</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="hideBackgroundDots"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormLabel className="cursor-pointer">
                      Hide Background Dots
                    </FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Size</FormLabel>
                    <FormControl>
                      <Slider
                        className="cursor-pointer"
                        value={[form.getValues("imageSize")]}
                        max={1}
                        min={0.1}
                        step={0.1}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="mt-3 text-center">
                        {field.value * 100} %
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageMargin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margin</FormLabel>
                    <FormControl>
                      <Slider
                        className="cursor-pointer"
                        value={[field.value]}
                        max={100}
                        min={0}
                        step={10}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="mt-3 text-center">{field.value} px</div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
