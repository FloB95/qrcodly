import React from "react";
import { Textarea } from "~/components/ui/textarea";

type TTextInputProps = {
  value: string;
  onChange: (e: string) => void;
};

export const TextInput = ({ value, onChange }: TTextInputProps) => {
  const [text, setText] = React.useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onChange(e.target.value);
  };

  return (
    <Textarea
      className="px-6 py-4"
      placeholder="Enter your Text..."
      value={text}
      onChange={(e) => handleChange(e)}
      rows={10}
    />
  );
};
