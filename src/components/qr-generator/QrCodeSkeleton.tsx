import React from "react";
import { Skeleton } from "~/components/ui/skeleton";

export const QrCodeSkeleton = () => {
  return (
    <div className="flex flex-col space-y-6">
      <Skeleton className="h-[300px] w-[300px] rounded-md" />
      <div className="flex justify-between">
        <Skeleton className="h-[40px] w-[160px] rounded-md" />
        <Skeleton className="h-[40px] w-[100px] rounded-md" />
      </div>
    </div>
  );
};
