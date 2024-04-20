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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
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
    settings.margin = Number(data.margin);
    settings.dotsOptions.type = data.dotStyle;
    settings.cornersSquareOptions.type = data.cornersSquareStyle;
    settings.cornersDotOptions.type = data.cornersDotStyle;
    settings.backgroundOptions.color = data.background;
    settings.imageOptions.hideBackgroundDots = data.hideBackgroundDots;
    settings.imageOptions.imageSize = Number(data.imageSize);
    settings.imageOptions.margin = Number(data.imageMargin);
    onChange(settings);
  };

  return (
    <Form {...form}>
      <form
        onChange={form.handleSubmit(handleChange)}
        className="w-2/3 space-y-6"
      >
        <Tabs defaultValue={"general"} className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger className="flex-1" value="general">
              General Settings
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="dot">
              Dot Settings
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="background">
              Background Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="margin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margin (px)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="dots">Dots</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="extraRounded">
                            Extra rounded
                          </SelectItem>
                          <SelectItem value="classy">Classy</SelectItem>
                          <SelectItem value="classyRounded">
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
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="dot">Dot</SelectItem>
                          <SelectItem value="extraRounded">
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
                      <Select>
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

          <TabsContent value="background" className="mt-0">
            <div className="flex flex-col flex-wrap space-y-6 p-2">
              <FormField
                control={form.control}
                name="background"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Background</FormLabel>
                      <FormControl>
                        <ColorPicker
                          background={field.value}
                          setBackground={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="hideBackgroundDots"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormLabel>Hide Background Dots</FormLabel>
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
                      <Input type="number" placeholder="0.4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageMargin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margin (px)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
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
