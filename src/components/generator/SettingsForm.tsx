/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";

import { useForm } from "react-hook-form";
import { type z } from "zod";

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

type SettingsFormProps = {
  onChange: (data: Options) => void;
  settings: Options;
};

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const form = useForm<z.infer<typeof QrCodeSettingsSchema>>({
    defaultValues: {
      background: settings.backgroundOptions.color,
    },
  });

  const handleChange = (data: z.infer<typeof QrCodeSettingsSchema>) => {
    onChange(data);
  };

  return (
    <Form {...form}>
      <form
        onChange={form.handleSubmit(handleChange)}
        className="w-2/3 space-y-6"
      >
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Width</FormLabel>
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
              <FormLabel>Height</FormLabel>
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
              <FormLabel>Margin</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dotStyle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dot Style</FormLabel>
              <FormControl>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="dots">Dots</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="extraRounded">Extra rounded</SelectItem>
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="dot">Dot</SelectItem>
                    <SelectItem value="extraRounded">Extra rounded</SelectItem>
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
                  <SelectTrigger className="w-[180px]">
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
              <FormLabel>Margin</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
