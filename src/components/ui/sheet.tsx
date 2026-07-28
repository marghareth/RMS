// FILE: src/components/ui/sheet.tsx
//
// A "slide-over" panel — the list stays visible and dimmed behind an
// overlay while detail/edit content slides in from the side, instead of
// navigating to a whole new page. Built on @base-ui/react's Dialog
// primitive (already a project dependency — see button.tsx), the same way
// shadcn's Sheet wraps Radix's Dialog.
"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Root — controls open/closed state. Pass `open` + `onOpenChange` to drive
// it from a parent (e.g. `selectedCaseId` in a list page).
function Sheet(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetPortal(props: React.ComponentProps<typeof Dialog.Portal>) {
  return <Dialog.Portal data-slot="sheet-portal" {...props} />;
}

function SheetBackdrop({ className, ...props }: React.ComponentProps<typeof Dialog.Backdrop>) {
  return (
    <Dialog.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/40",
        "transition-opacity duration-300",
        "data-open:opacity-100 data-closed:opacity-0",
        className
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends React.ComponentProps<typeof Dialog.Popup> {
  side?: "right" | "left";
  /** Tailwind width class, e.g. "max-w-xl". Defaults to a sensible reading width. */
  widthClassName?: string;
}

function SheetContent({
  className,
  side = "right",
  widthClassName = "max-w-2xl",
  children,
  ...props
}: SheetContentProps) {
  const edge = side === "right" ? "right-0" : "left-0";
  const closedTransform = side === "right" ? "data-[closed]:translate-x-full" : "data-[closed]:-translate-x-full";

  return (
    <SheetPortal>
      <SheetBackdrop />
      <Dialog.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex w-full flex-col bg-white shadow-2xl",
          edge,
          widthClassName,
          "transition-transform duration-300 ease-out",
          "data-open:translate-x-0",
          closedTransform,
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex items-start justify-between gap-4 border-b border-[#E9EAEC] px-6 py-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="sheet-title"
      className={cn("text-[15px] font-bold text-[#1F2937]", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="sheet-description"
      className={cn("text-[12px] text-[#9CA3AF]", className)}
      {...props}
    />
  );
}

function SheetClose({ className, ...props }: React.ComponentProps<typeof Dialog.Close>) {
  return (
    <Dialog.Close
      data-slot="sheet-close"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]",
        className
      )}
      {...props}
    >
      <X size={16} />
    </Dialog.Close>
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-body" className={cn("flex-1 overflow-y-auto px-6 py-5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex items-center justify-end gap-2 border-t border-[#E9EAEC] px-6 py-4", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetBackdrop,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
  SheetFooter,
};