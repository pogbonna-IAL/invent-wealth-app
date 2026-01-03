"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { deleteProperty } from "@/app/actions/admin/properties";
import { toast } from "sonner";

interface DeletePropertyButtonProps {
  propertyId: string;
  propertyName: string;
  onDeleted?: () => void;
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeletePropertyButton({
  propertyId,
  propertyName,
  onDeleted,
  variant = "destructive",
  size = "sm",
}: DeletePropertyButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProperty(propertyId);

      if (result.success) {
        toast.success("Property deleted successfully");
        setOpen(false);
        
        // Call callback if provided
        if (onDeleted) {
          onDeleted();
        } else {
          // Default: redirect to properties list
          router.push("/admin/properties");
          router.refresh();
        }
      } else {
        toast.error(result.error || "Failed to delete property");
      }
    } catch (error) {
      console.error("Delete property error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={isDeleting}>
          <Trash2 className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""}`} />
          {size !== "icon" && size !== "sm" && "Delete Property"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the property and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All pending investments</li>
              <li>Rental statements</li>
              <li>Distributions</li>
              <li>Documents</li>
              <li>Payout records</li>
            </ul>
            <div className="mt-3 p-2 bg-muted rounded">
              <p className="text-sm font-medium">Property to delete:</p>
              <p className="text-sm">{propertyName}</p>
            </div>
            <strong className="block mt-2 text-destructive">
              This action cannot be undone.
            </strong>
            <p className="text-sm text-muted-foreground mt-2">
              Note: Properties with confirmed investments cannot be deleted. Please cancel or refund investments first.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

