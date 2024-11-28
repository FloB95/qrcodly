"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Loader } from "../ui/loader";

// Dynamischer Import von SwaggerUI mit ssr deaktiviert
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export const Swagger = ({ swagger }: { swagger: object }) => {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <SwaggerUI spec={swagger} onComplete={() => setLoading(false)} />
      {loading && (
        <div className="my-32 flex justify-center">
          <Loader />
        </div>
      )}
    </>
  );
};
