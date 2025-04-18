import { cn } from "@/lib/utils";

export default function Container({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "container relative mx-auto overflow-hidden sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
