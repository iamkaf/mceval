"use client";

import { useTransition } from "react";

import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="sm">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "secondary-destructive" : "primary"}
            type="button"
            onClick={() => startTransition(() => onConfirm())}
            disabled={pending}
          >
            {pending ? "..." : confirmLabel}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
