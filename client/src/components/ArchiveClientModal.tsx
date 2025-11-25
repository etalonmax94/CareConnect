import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Archive, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

interface ArchiveClientModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ArchiveClientModal({ client, open, onOpenChange, onSuccess }: ArchiveClientModalProps) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/clients/${client.id}/archive`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id] });
      toast({
        title: "Client archived",
        description: `${client.participantName} has been archived successfully. Records will be retained for 7 years.`,
      });
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive client",
        variant: "destructive",
      });
    },
  });

  const handleArchive = () => {
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for archiving this client",
        variant: "destructive",
      });
      return;
    }
    archiveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archive Client
          </DialogTitle>
          <DialogDescription>
            Archive {client.participantName}'s record. Archived records are read-only and retained for 7 years per Australian Privacy Act compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Archived clients cannot be edited. This action can be reversed by restoring the client later.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="archive-reason">Reason for archiving</Label>
            <Textarea
              id="archive-reason"
              placeholder="e.g., Client discharged, Services completed, Moved to another provider..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-testid="input-archive-reason"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiveMutation.isPending}
            data-testid="button-cancel-archive"
          >
            Cancel
          </Button>
          <Button
            onClick={handleArchive}
            disabled={!reason.trim() || archiveMutation.isPending}
            className="gap-2"
            data-testid="button-confirm-archive"
          >
            <Archive className="w-4 h-4" />
            {archiveMutation.isPending ? "Archiving..." : "Archive Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
