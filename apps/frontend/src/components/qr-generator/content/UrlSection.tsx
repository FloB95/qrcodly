"use client";

import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@clerk/nextjs";
import { LoginRequiredDialog } from "../LoginRequiredDialog";
import { Badge } from "@/components/ui/badge";
import { UrlInputSchema } from "qrcodly-api-types";

type TUrlSectionProps = {
  value: string;
  editable: boolean;
  onChange: (value: string, editable: boolean) => void;
};

const formSchema = z.object({
  url: UrlInputSchema,
  editable: z.boolean(),
});

export const UrlSection = ({ value, editable, onChange }: TUrlSectionProps) => {
  const { isSignedIn } = useAuth();
  const [alertOpen, setAlertOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: value,
      editable,
    },
  });
  const [debounced] = useDebouncedValue(form.watch("url"), 500);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onChange(values.url, values.editable);
  }

  // handle submit automatically after debounced value
  useEffect(() => {
    if (debounced === value) return;
    void form.handleSubmit(onSubmit)();
  }, [debounced, value, form]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    className="p-6"
                    placeholder="Enter URL https://example.com/"
                    autoFocus
                    onBlur={(e) => {
                      if (e.target.value === "") return;
                      if (
                        !e.target.value.startsWith("http://") &&
                        !e.target.value.startsWith("https://")
                      ) {
                        field.onChange(`https://${e.target.value}`);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="editable"
            render={({ field }) => (
              <FormItem>
                <div className="flex">
                  <FormControl>
                    <Switch
                      disabled
                      checked={field.value}
                      onCheckedChange={(e) => {
                        if (!isSignedIn) {
                          setAlertOpen(true);
                          return;
                        }
                        field.onChange(e);
                        void form.handleSubmit(onSubmit)();
                      }}
                    />
                  </FormControl>
                  <FormLabel className="ml-2 mt-[4px] relative pr-10">
                    Enable Statistics and Editing
                    <Badge className="block absolute top-5 sm:top-[-10px] sm:right-[-35%] w-[110px]">Coming soon!</Badge>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
    </>
  );
};
