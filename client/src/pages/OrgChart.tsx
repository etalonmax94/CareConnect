import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff } from "@shared/schema";
import { User, Mail, Phone, MapPin, Users, Settings2, X } from "lucide-react";
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

interface StaffWithRelations extends Staff {
  supervisor?: Staff;
  subordinates?: Staff[];
}

interface OrgNode {
  staff: Staff;
  supervisor?: Staff;
  subordinates: Staff[];
  level: number;
}

export default function OrgChart() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const assignSupervisorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff || !selectedSupervisor) return;
      const response = await apiRequest("PATCH", `/api/staff/${selectedStaff.id}`, {
        supervisorId: selectedSupervisor,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
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
      toast({
        title: "Success",
        description: "Supervisor removed successfully",
      });
      setShowAssignDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove supervisor",
        variant: "destructive",
      });
    },
  });

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role color
  const getRoleColor = (role?: string | null) => {
    if (!role) return "bg-gray-100 text-gray-700";
    const roleLower = role.toLowerCase();
    if (roleLower.includes("director") || roleLower.includes("ceo")) return "bg-purple-100 text-purple-700";
    if (roleLower.includes("manager")) return "bg-blue-100 text-blue-700";
    if (roleLower.includes("coordinator")) return "bg-green-100 text-green-700";
    if (roleLower.includes("support")) return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  // Render a staff profile card
  const StaffCard = ({ staffMember, supervisor, subordinateCount, level }: {
    staffMember: Staff;
    supervisor?: Staff;
    subordinateCount: number;
    level: number;
  }) => {
    return (
      <Card className="w-80 hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
        <CardContent className="p-4">
          {/* Header with avatar and basic info */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-16 w-16 border-2 border-primary/10">
              <AvatarImage src={staffMember.profileImageUrl || undefined} alt={staffMember.name} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                {getInitials(staffMember.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{staffMember.name}</h3>
              <Badge variant="secondary" className={`${getRoleColor(staffMember.role)} text-xs mt-1`}>
                {staffMember.role || "Staff Member"}
              </Badge>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => {
                setSelectedStaff(staffMember);
                setSelectedSupervisor(staffMember.supervisorId || "");
                setShowAssignDialog(true);
              }}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact details */}
          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            {staffMember.email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{staffMember.email}</span>
              </div>
            )}
            {staffMember.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{staffMember.phone}</span>
              </div>
            )}
            {staffMember.location && (
              <div className="flex items-center gap-2 truncate">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{staffMember.location}</span>
              </div>
            )}
          </div>

          {/* Supervisor info */}
          {supervisor && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">Reports to:</span>
                <span className="truncate">{supervisor.name}</span>
              </div>
            </div>
          )}

          {/* Subordinates count */}
          {subordinateCount > 0 && (
            <div className="pt-3 border-t mt-3">
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-primary">
                  {subordinateCount} {subordinateCount === 1 ? "Direct Report" : "Direct Reports"}
                </span>
              </div>
            </div>
          )}

          {/* Active status */}
          <div className="pt-3 border-t mt-3">
            <Badge
              variant={staffMember.isActive === "yes" ? "default" : "secondary"}
              className="text-xs"
            >
              {staffMember.isActive === "yes" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organisational chart...</p>
        </div>
      </div>
    );
  }

  // Get supervisor for a staff member
  const getSupervisor = (staffMember: Staff) => {
    return staff.find((s) => s.id === staffMember.supervisorId);
  };

  // Get subordinates for a staff member
  const getSubordinates = (staffMember: Staff) => {
    return staff.filter((s) => s.supervisorId === staffMember.id);
  };

  // Build hierarchy tree
  const buildHierarchy = (staffMember: Staff, level = 0): React.ReactNode => {
    const subordinates = getSubordinates(staffMember);
    const supervisor = getSupervisor(staffMember);
    const hasSubordinates = subordinates.length > 0;

    return (
      <div key={staffMember.id} className="flex flex-col items-center">
        {/* Staff card */}
        <div className="mb-6">
          <StaffCard
            staffMember={staffMember}
            supervisor={supervisor}
            subordinateCount={subordinates.length}
            level={level}
          />
        </div>

        {/* Connection line to subordinates */}
        {hasSubordinates && (
          <>
            <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-primary/20"></div>

            {/* Subordinates container */}
            <div className="flex gap-8 relative">
              {/* Horizontal connecting line */}
              {subordinates.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-primary/20"
                  style={{
                    left: "40px",
                    right: "40px",
                  }}
                ></div>
              )}

              {/* Render subordinates */}
              {subordinates.map((sub, index) => (
                <div key={sub.id} className="flex flex-col items-center">
                  {/* Vertical line from horizontal connector to card */}
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary/20 to-primary/10"></div>

                  {/* Recursive call for subordinate */}
                  {buildHierarchy(sub, level + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Get root level staff (no supervisor)
  const rootStaff = staff.filter((s) => !s.supervisorId && s.isActive === "yes");

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 px-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Organisational Chart
            </h1>
            <p className="text-muted-foreground">
              Team hierarchy and reporting structure
            </p>
          </div>

          {/* Chart */}
          {rootStaff.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No staff members found</p>
            </div>
          ) : (
            <div className="flex justify-center gap-12 pb-8">
              {rootStaff.map((member) => buildHierarchy(member))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Supervisor Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Manage Supervisor
            </DialogTitle>
            <DialogDescription>
              {selectedStaff && (
                <span>
                  Configure supervisor for <strong>{selectedStaff.name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current supervisor info */}
            {selectedStaff?.supervisorId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Supervisor:</p>
                <p className="font-medium">
                  {staff.find((s) => s.id === selectedStaff.supervisorId)?.name}
                </p>
              </div>
            )}

            {/* Supervisor selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {selectedStaff?.supervisorId ? "Change Supervisor" : "Assign Supervisor"}
              </label>
              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {staff
                    .filter((s) => s.id !== selectedStaff?.id && s.isActive === "yes")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {s.role && (
                            <span className="text-xs text-muted-foreground">({s.role})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2">
              {selectedStaff?.supervisorId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedStaff) {
                      removeSupervisorMutation.mutate(selectedStaff.id);
                    }
                  }}
                  disabled={removeSupervisorMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
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
