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
import { ColorPicker } from "./ColorPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Slider } from "~/components/ui/slider";
import { Input } from "~/components/ui/input";
import {
  type TCornerSquareType,
  type TCornerDotType,
  type TDotType,
  type TQRcodeOptions,
} from "~/server/domain/types/QRcode";

type SettingsFormProps = {
  onChange: (data: TQRcodeOptions) => void;
  settings: TQRcodeOptions;
};

type FormValues = {
  width: number;
  height: number;
  margin: number;
  dotStyle: TDotType;
  dotColor: string;
  cornersSquareStyle: TCornerSquareType;
  cornersDotStyle: TCornerDotType;
  cornersDotColor: string;
  cornersSquareColor: string;
  background: string;
  hideBackgroundDots: boolean;
  image: string;
  imageSize: number;
  imageMargin: number;
};

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      width: settings?.width ?? 300,
      height: settings?.height ?? 300,
      margin: settings?.margin ?? 0,
      dotStyle: settings?.dotsOptions?.type ?? "rounded",
      dotColor: settings?.dotsOptions?.color ?? "#000000",
      cornersSquareStyle:
        settings?.cornersSquareOptions?.type ?? "extra-rounded",
      cornersDotStyle: settings?.cornersDotOptions?.type ?? "dot",
      cornersDotColor: settings?.cornersDotOptions?.color ?? "#000000",
      cornersSquareColor: settings?.cornersSquareOptions?.color ?? "#000000",
      background: settings?.backgroundOptions?.color ?? "#ffffff",
      hideBackgroundDots: settings?.imageOptions?.hideBackgroundDots ?? true,
      image: settings?.image ?? "",
      imageSize: settings?.imageOptions?.imageSize ?? 0.4,
      imageMargin: settings?.imageOptions?.margin ?? 0,
    },
  });

  const handleChange = (data: FormValues) => {
    // map form data with settings
    settings.width = Number(data.width);
    settings.height = Number(data.height);
    if (typeof settings.margin !== "undefined")
      settings.margin = Number(data.margin);
    if (settings.dotsOptions) settings.dotsOptions.type = data.dotStyle;
    if (settings.dotsOptions) settings.dotsOptions.color = data.dotColor;
    if (settings.cornersSquareOptions)
      settings.cornersSquareOptions.type = data.cornersSquareStyle;
    if (settings.cornersSquareOptions)
      settings.cornersSquareOptions.color = data.cornersSquareColor;
    if (settings.cornersDotOptions)
      settings.cornersDotOptions.type = data.cornersDotStyle;
    if (settings.cornersDotOptions)
      settings.cornersDotOptions.color = data.cornersDotColor;
    if (settings.backgroundOptions)
      settings.backgroundOptions.color = data.background;
    if (typeof settings.image !== "undefined") settings.image = data.image;
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
        className="space-y-6 xl:w-2/3"
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
                        name="width"
                        className="cursor-pointer"
                        value={[form.getValues("width")]}
                        max={2000}
                        min={300}
                        step={25}
                        onValueChange={(e: any) => {
                          form.setValue("width", e as number);
                          form.setValue("height", e as number);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="pt-1 text-center">
                      {form.getValues("height")} x {form.getValues("width")} px
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
                        name="margin"
                        className="cursor-pointer"
                        value={[field.value]}
                        max={300}
                        min={0}
                        step={10}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="pt-1 text-center">
                      {field.value} px
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
                            setBackground={(color) => {
                              field.onChange(color);
                              handleChange(form.getValues());
                            }}
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
              <div className="flex w-full flex-wrap space-x-8">
                <FormField
                  control={form.control}
                  name="dotStyle"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Dot Style</FormLabel>
                      <FormControl>
                        <Select
                          name="dotStyle"
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
                  name="dotColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dot Color</FormLabel>
                      <FormControl>
                        <div>
                          <ColorPicker
                            background={field.value}
                            setBackground={(color) => {
                              field.onChange(color);
                              handleChange(form.getValues());
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex w-full flex-wrap space-x-8">
                <FormField
                  control={form.control}
                  name="cornersSquareStyle"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Corners Square Style</FormLabel>
                      <FormControl>
                        <Select
                          name="cornersSquareStyle"
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
                  name="cornersSquareColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corners Square Color</FormLabel>
                      <FormControl>
                        <div>
                          <ColorPicker
                            background={field.value}
                            setBackground={(color) => {
                              field.onChange(color);
                              handleChange(form.getValues());
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex w-full flex-wrap space-x-8">
                <FormField
                  control={form.control}
                  name="cornersDotStyle"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Corners Dot Style</FormLabel>
                      <FormControl>
                        <Select
                          name="cornersDotStyle"
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
                <FormField
                  control={form.control}
                  name="cornersDotColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corners Dot Color</FormLabel>
                      <FormControl>
                        <div>
                          <ColorPicker
                            background={field.value}
                            setBackground={(color) => {
                              field.onChange(color);
                              handleChange(form.getValues());
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                          name="image"
                          type="file"
                          accept=".jpg,.jpeg,.png,.svg,.webp"
                          // value={field.value}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            // transform file to base64 url
                            if (file) {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = () => {
                                const base64 = reader.result as string;
                                field.onChange(base64);
                                handleChange(form.getValues());
                              };
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        name="hideBackgroundDots"
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
                        name="imageSize"
                        className="cursor-pointer"
                        value={[form.getValues("imageSize")]}
                        max={1}
                        min={0.1}
                        step={0.1}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="pt-1 text-center">
                      {field.value * 100} %
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
                        name="imageMargin"
                        className="cursor-pointer"
                        value={[field.value]}
                        max={100}
                        min={0}
                        step={10}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="pt-1 text-center">
                      {field.value} px
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
