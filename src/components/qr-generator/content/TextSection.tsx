"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextInputSchema } from "~/server/domain/types/QRcode";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { useEffect } from "react";
import { Textarea } from "~/components/ui/textarea";

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
  const [debounced] = useDebouncedValue(form.getValues("text"), 500);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onChange(values.text);
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
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  autoFocus
                  className="px-6 py-3.5"
                  placeholder="Enter your Text..."
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
