import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff } from "@shared/schema";
import { ChevronDown, Plus, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface StaffWithSupervisor extends Staff {
  supervisor?: Staff;
  subordinates?: Staff[];
}

export default function OrgChart() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: hierarchy = {} } = useQuery<Record<string, StaffWithSupervisor>>({
    queryKey: ["/api/org-chart/hierarchy"],
  });

  const assignSupervisorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff || !selectedSupervisor) return;
      const response = await apiRequest("PATCH", `/api/staff/${selectedStaff}`, {
        supervisorId: selectedSupervisor,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-chart/hierarchy"] });
      toast({
        title: "Success",
        description: "Supervisor assigned successfully",
      });
      setShowAssignDialog(false);
      setSelectedStaff(null);
      setSelectedSupervisor("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign supervisor",
        variant: "destructive",
      });
    },
  });

  const removeSupervisorMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await apiRequest("PATCH", `/api/staff/${staffId}`, {
        supervisorId: null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-chart/hierarchy"] });
      toast({
        title: "Success",
        description: "Supervisor removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove supervisor",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading organizational chart...</div>;
  }

  // Get root level staff (no supervisor)
  const rootStaff = staff.filter((s) => !s.supervisorId);
  
  // Build hierarchy map
  const buildHierarchy = (staffMember: Staff, depth = 0): React.ReactNode => {
    const subordinates = staff.filter((s) => s.supervisorId === staffMember.id);
    const hasSubordinates = subordinates.length > 0;

    return (
      <div key={staffMember.id} className="mb-4">
        <Card
          className="p-4 hover-elevate cursor-pointer transition-all"
          data-testid={`org-chart-item-${staffMember.id}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{staffMember.name}</p>
              <p className="text-xs text-muted-foreground">{staffMember.role}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setSelectedStaff(staffMember.id);
                setShowAssignDialog(true);
              }}
              data-testid={`button-assign-supervisor-${staffMember.id}`}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {hasSubordinates && (
          <div className="ml-6 mt-2 border-l-2 border-sidebar-border/30 pl-4">
            {subordinates.map((sub) => buildHierarchy(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Organizational Chart</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff hierarchy and supervisor assignments
          </p>
        </div>

        {rootStaff.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No staff members found
          </div>
        ) : (
          <div className="space-y-2">
            {rootStaff.map((member) => buildHierarchy(member))}
          </div>
        )}
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Supervisor</DialogTitle>
            <DialogDescription>
              Select a supervisor for {staff.find((s) => s.id === selectedStaff)?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supervisor</label>
              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                <SelectTrigger data-testid="select-supervisor">
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {staff
                    .filter((s) => s.id !== selectedStaff)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between gap-2">
              {staff.find((s) => s.id === selectedStaff)?.supervisorId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedStaff) {
                      removeSupervisorMutation.mutate(selectedStaff);
                      setShowAssignDialog(false);
                    }
                  }}
                  disabled={removeSupervisorMutation.isPending}
                  data-testid="button-remove-supervisor"
                >
                  Remove Supervisor
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => assignSupervisorMutation.mutate()}
                  disabled={!selectedSupervisor || assignSupervisorMutation.isPending}
                  data-testid="button-confirm-supervisor"
                >
                  {assignSupervisorMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
