"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { TextInputSchema } from "qrcodly-api-types";

type TTextSectionProps = {
  value: string;
  onChange: (e: string) => void;
};

const formSchema = z.object({
  text: TextInputSchema,
});

export const TextSection = ({ value, onChange }: TTextSectionProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: value,
    },
  });
  const [debounced] = useDebouncedValue(form.watch("text"), 500);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onChange(values.text);
  }

  // handle submit automatically after debounced value
  useEffect(() => {
    if (debounced === value) return;
    void form.handleSubmit(onSubmit)();
  }, [debounced, value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  autoFocus
                  className="px-6 py-3.5"
                  placeholder="Enter your text..."
                  rows={10}
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
