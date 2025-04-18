"use client";

import { QrCodeDefaults } from "@/config/QrCodeDefaults";
import { LoginRequiredDialog } from "../LoginRequiredDialog";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { NameDialog } from "../NameDialog";
import type { TQrCodeOptions } from "qrcodly-api-types";
import { Button } from "@/components/ui/button";

const QrCodeSaveTemplateBtn = ({ config }: { config: TQrCodeOptions }) => {
  const { isSignedIn } = useAuth();
  const [alertOpen, setAlertOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  const handleSave = async (templateName: string) => {
    setNameDialogOpen(false);
    // try {
    //   await createQrCodeTemplateMutation.mutateAsync(
    //     {
    //       config: currentConfig,
    //       name: templateName,
    //     },
    //     {
    //       onSuccess: () => {
    //         toast({
    //           title: "New Template Created",
    //           description:
    //             "We saved your QR Code Template in your dashboard for later use.",
    //           duration: 10000,
    //         });
    //       },
    //     },
    //   );
    // } catch (error) {
    //   console.error(error);
    // }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            // isLoading={createQrCodeTemplateMutation.isPending}
            onClick={() => {
              if (!isSignedIn) {
                setAlertOpen(true);
                return;
              }
              setNameDialogOpen(true);
            }}
            disabled={JSON.stringify(config) === JSON.stringify(QrCodeDefaults)}
          >
            Save as Template
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Save the current QR code style as a reusable template.</p>
        </TooltipContent>
      </Tooltip>

      <LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />

      <NameDialog
        dialogHeadline="Save current QR code style as template"
        placeholder="Template Name"
        isOpen={nameDialogOpen}
        setIsOpen={setNameDialogOpen}
        onSubmit={handleSave}
      />
    </>
  );
};

export default QrCodeSaveTemplateBtn;
