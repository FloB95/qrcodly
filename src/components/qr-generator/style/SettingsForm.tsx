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
import IconPicker from "./IconPicker";

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
  cornersSquareColor: string;
  cornersDotStyle: TCornerDotType;
  cornersDotColor: string;
  background: string;
  hideBackgroundDots: boolean;
  image: string;
  imageSize: number;
  imageMargin: number;
};

export const SettingsForm = ({ onChange, settings }: SettingsFormProps) => {
  const handleIconSelect = (iconName?: string) => {
    settings.image = iconName;
    onChange(settings);
    form.setValue("image", iconName);
  };

  const form = useForm<FormValues>({
    defaultValues: {
      width: settings.width,
      height: settings.height,
      margin: settings.margin,
      dotStyle: settings.dotsOptions?.type ?? "dot",
      dotColor:
        "color" in settings.dotsOptions
          ? settings.dotsOptions.color
          : "#000000",
      cornersSquareStyle: settings.cornersSquareOptions?.type ?? "square",
      cornersSquareColor:
        "color" in settings.cornersSquareOptions
          ? settings.cornersSquareOptions.color
          : "#000000",
      cornersDotStyle: settings.cornersDotOptions?.type ?? "dot",
      cornersDotColor:
        "color" in settings.cornersDotOptions
          ? settings.cornersDotOptions.color
          : "#000000",
      background:
        "color" in settings.backgroundOptions
          ? settings.backgroundOptions.color
          : "#ffffff",
      hideBackgroundDots: settings.imageOptions?.hideBackgroundDots ?? true,
      image: settings.image ?? "",
      imageSize: settings.imageOptions?.imageSize ?? 0.4,
      imageMargin: settings.imageOptions?.margin ?? 30,
    },
  });

  const handleChange = (data: FormValues) => {
    // map form data with settings
    settings.width = Number(data.width);
    settings.height = Number(data.height);
    settings.margin = (settings.width / 100) * data.margin;

    type OptionType = {
      type?: string;
      color?: string;
      hideBackgroundDots?: boolean;
      imageSize?: number;
      margin?: number;
      round?: number;
      gradient?: {
        type: "radial" | "linear";
        rotation: number;
        colorStops: { color: string; offset: number }[];
      };
    };

    const updateOption = <K extends keyof OptionType>(
      option: OptionType | undefined,
      key: K,
      value: OptionType[K],
    ) => {
      if (option) option[key] = value;
    };

    updateOption(settings.dotsOptions, "type", data.dotStyle);
    updateOption(settings.dotsOptions, "color", data.dotColor);
    updateOption(
      settings.cornersSquareOptions,
      "type",
      data.cornersSquareStyle,
    );
    updateOption(
      settings.cornersSquareOptions,
      "color",
      data.cornersSquareColor,
    );
    updateOption(settings.cornersDotOptions, "type", data.cornersDotStyle);
    updateOption(settings.cornersDotOptions, "color", data.cornersDotColor);
    updateOption(settings.backgroundOptions, "color", data.background);
    if (typeof settings.image !== "undefined") settings.image = data.image;
    updateOption(
      settings.imageOptions,
      "hideBackgroundDots",
      data.hideBackgroundDots,
    );
    updateOption(settings.imageOptions, "imageSize", Number(data.imageSize));
    updateOption(settings.imageOptions, "margin", Number(data.width) * 0.03);

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
              General
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="dot">
              Shape
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="image">
              Icon
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="width"
                render={() => (
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
                    <FormLabel>Border Spacing</FormLabel>
                    <FormControl>
                      <Slider
                        name="margin"
                        className="cursor-pointer"
                        value={[field.value]}
                        max={10}
                        min={0}
                        step={1}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="pt-1 text-center">
                      {field.value} %
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
                            background={[field.value]}
                            setBackground={(color) => {
                              field.onChange(color[0]);
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
              <div className="block w-full flex-wrap space-y-2 sm:flex sm:space-x-8 sm:space-y-0">
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
                            background={[field.value]}
                            setBackground={(color) => {
                              field.onChange(color[0]);
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

              <div className="block w-full flex-wrap space-y-2 sm:flex sm:space-x-8 sm:space-y-0">
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
                            background={[field.value]}
                            setBackground={(color) => {
                              field.onChange(color[0]);
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

              <div className="block w-full flex-wrap space-y-2 sm:flex sm:space-x-8 sm:space-y-0">
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
                            background={[field.value]}
                            setBackground={(color) => {
                              field.onChange(color[0]);
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
                    <FormLabel>Icon</FormLabel>
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
                              // check max file size
                              if (file.size > 1 * 1024 * 1024) {
                                alert("File is too big! Max size is 1MB");
                                // clear file
                                e.target.value = "";
                                return;
                              }

                              // convert to base64
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

              <div>
                <p className="text-sm font-medium leading-none mb-4">You can also choose from predefined icons</p>
                <IconPicker onSelect={handleIconSelect} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
};
