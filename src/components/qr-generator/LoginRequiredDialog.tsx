import { SignInButton } from "@clerk/nextjs";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export const LoginRequiredDialog = ({
  alertOpen,
  setAlertOpen,
}: {
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
}) => {
  return (
    <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Login Required!</AlertDialogTitle>
          <AlertDialogDescription>
            You need to sign in to use this feature. <br />
            <strong>${`Don't worry, it's free!`}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <SignInButton>
            <AlertDialogAction>Sign in</AlertDialogAction>
          </SignInButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
