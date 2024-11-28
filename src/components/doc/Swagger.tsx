"use client";
import React, { useState } from "react";
import SwaggerUI from "swagger-ui-react";
import { Loader } from "../ui/loader";

export const Swagger = ({ swagger }: { swagger: object }) => {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <SwaggerUI
        spec={swagger}
        onComplete={(system) => {
          console.log(system);
          setLoading(false);
        }}
      />
      {loading && (
        <div className="my-32 flex justify-center">
          <Loader />
        </div>
      )}
    </>
  );
};
