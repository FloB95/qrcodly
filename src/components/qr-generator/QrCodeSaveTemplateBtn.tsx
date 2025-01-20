"use client";

import { api } from "~/lib/trpc/react";
import { TQRcodeOptions } from "~/server/domain/types/QRcode";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { LoginRequiredDialog } from "./LoginRequiredDialog";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { NameDialog } from "./NameDialog";

const QrCodeSaveTemplateBtn = ({ config }: { config: TQRcodeOptions }) => {
  const { isSignedIn } = useAuth();
  const [alertOpen, setAlertOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const currentConfig: any = { ...config };
  const defaultConfig: any = { ...QrCodeDefaults };

  // remove data from config and data from QrCodeDefaults
  delete currentConfig.data;
  delete defaultConfig.data;

  const createQrCodeTemplateMutation = api.qrCodeTemplate.create.useMutation();

  const handleSave = async (templateName: string) => {
    setNameDialogOpen(false);
    try {
      await createQrCodeTemplateMutation.mutateAsync(
        {
          config: currentConfig,
          name: templateName,
        },
        {
          onSuccess: () => {
            toast({
              title: "New Template Created",
              description:
                "We saved your QR Code Template in your dashboard for later use.",
              duration: 10000,
            });
          },
        },
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            isLoading={createQrCodeTemplateMutation.isPending}
            onClick={() => {
              if (!isSignedIn) {
                setAlertOpen(true);
                return;
              }
              setNameDialogOpen(true);
            }}
            disabled={
              JSON.stringify(currentConfig) === JSON.stringify(defaultConfig) ||
              createQrCodeTemplateMutation.isPending
            }
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
