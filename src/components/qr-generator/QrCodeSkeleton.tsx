import React from "react";
import { Skeleton } from "~/components/ui/skeleton";

export const QrCodeSkeleton = () => {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-[300px] w-[300px] rounded-md" />
      <div className="mt-6 flex justify-between">
        <Skeleton className="h-[40px] w-[140px] rounded-md" />
        <Skeleton className="h-[40px] w-[130px] rounded-md" />
      </div>
    </div>
  );
};
