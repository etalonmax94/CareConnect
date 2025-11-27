import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProviderType, providerConfig } from "./AddProviderDialog";

interface DeleteConfirmationDialogProps {
  providerType: ProviderType;
  provider: Record<string, any>;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  triggerVariant?: "default" | "ghost" | "outline" | "secondary" | "destructive";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

export function DeleteConfirmationDialog({ 
  providerType, 
  provider,
  onSuccess, 
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "icon",
}: DeleteConfirmationDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  
  const config = providerConfig[providerType];
  const entityName = config.title.replace("Add New ", "");
  const displayName = provider.name || provider.participantName || "this item";

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `${config.endpoint}/${provider.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setIsOpen(false);
      toast({ 
        title: `${entityName} deleted`, 
        description: `${displayName} has been removed successfully.` 
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: `Failed to delete ${entityName.toLowerCase()}`, 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <AlertDialogTrigger asChild>
          <Button 
            type="button" 
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
            data-testid={`button-delete-${providerType}-${provider.id}`}
          >
            {triggerSize === "icon" ? (
              <Trash2 className="h-4 w-4 text-destructive" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {entityName}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold">{displayName}</span>? 
            This action cannot be undone and will permanently remove this record from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid={`button-confirm-delete-${providerType}`}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
