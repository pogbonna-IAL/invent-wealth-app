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
import { deleteUser } from "@/app/actions/admin/users";
import { toast } from "sonner";

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  onDeleted?: () => void;
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeleteUserButton({
  userId,
  userEmail,
  userName,
  onDeleted,
  variant = "destructive",
  size = "sm",
}: DeleteUserButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUser(userId);

      if (result.success) {
        toast.success("User deleted successfully");
        setOpen(false);
        
        // Call callback if provided
        if (onDeleted) {
          onDeleted();
        } else {
          // Default: redirect to users list
          router.push("/admin/users");
          router.refresh();
        }
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the user account and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All investments</li>
              <li>Transaction history</li>
              <li>Payout records</li>
              <li>Personal information</li>
              <li>Profile and onboarding data</li>
            </ul>
            <div className="mt-3 p-2 bg-muted rounded">
              <p className="text-sm font-medium">User to delete:</p>
              <p className="text-sm">{userName || "N/A"} ({userEmail || "N/A"})</p>
            </div>
            <strong className="block mt-2 text-destructive">This action cannot be undone.</strong>
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

