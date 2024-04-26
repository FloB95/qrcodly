"use client";

import { Input } from "~/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UrlInputSchema } from "~/server/domain/types/QRcode";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { useEffect } from "react";

type TUrlSectionProps = {
  value: string;
  onChange: (e: string) => void;
};

const formSchema = z.object({
  url: UrlInputSchema,
});

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: value,
    },
  });
  const [debounced] = useDebouncedValue(form.getValues("url"), 500);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onChange(values.url);
  }

  // handle submit automatically after debounced value
  useEffect(() => {
    if (debounced === value) return;
    void form.handleSubmit(onSubmit)();
  }, [debounced]);

  return (
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
