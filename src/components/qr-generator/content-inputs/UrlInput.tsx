import React from "react";
import { Input } from "~/components/ui/input";

type TUrlInputProps = {
  value: string;
  onChange: (e: string) => void;
};

export const UrlInput = ({ value, onChange }: TUrlInputProps) => {
  const [url, setUrl] = React.useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    onChange(e.target.value);
  };

  return (
    <Input
      className="p-6"
      placeholder="Enter URL https://example.com/"
      value={url}
      onChange={(e) => handleChange(e)}
      autoFocus
    />
  );
};
