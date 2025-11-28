import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Check, 
  X, 
  Clock, 
  UserCheck, 
  UserX, 
  Users, 
  Loader2,
  Mail,
  Calendar,
  Shield
} from "lucide-react";
import type { User } from "@shared/schema";
import { USER_ROLES, type UserRole } from "@shared/schema";

export default function UserApprovals() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"pending" | "all">("pending");

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery<User[]>({
    queryKey: ["/api/users/pending"],
    enabled: viewMode === "pending",
  });

  const { data: allUsers, isLoading: allLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: viewMode === "all",
  });

  const users = viewMode === "pending" ? pendingUsers : allUsers;
  const isLoading = viewMode === "pending" ? pendingLoading : allLoading;

  const approveMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: UserRole[] }) => {
      return await apiRequest("POST", `/api/users/${userId}/approve`, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Approved",
        description: `${selectedUser?.displayName || "User"} has been approved and can now access the system.`,
      });
      setApproveDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return await apiRequest("POST", `/api/users/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Rejected",
        description: `${selectedUser?.displayName || "User"}'s access request has been denied.`,
      });
      setRejectDialogOpen(false);
      setSelectedUser(null);
      setRejectReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: UserRole[] }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/roles`, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Roles Updated",
        description: "User roles have been updated successfully.",
      });
      setApproveDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user roles",
        variant: "destructive",
      });
    },
  });

  const handleApproveClick = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles([]);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (user: User) => {
    setSelectedUser(user);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRoleToggle = (role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleApproveConfirm = () => {
    if (!selectedUser || selectedRoles.length === 0) {
      toast({
        title: "Roles Required",
        description: "Please select at least one role for the user.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedUser.approvalStatus === "approved") {
      updateRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles });
    } else {
      approveMutation.mutate({ userId: selectedUser.id, roles: selectedRoles });
    }
  };

  const handleRejectConfirm = () => {
    if (!selectedUser) return;
    rejectMutation.mutate({ userId: selectedUser.id, reason: rejectReason });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="border-green-500 text-green-600"><UserCheck className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-500 text-red-600"><UserX className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getRoleLabels = (roles: UserRole[]) => {
    if (!roles || roles.length === 0) return "No roles assigned";
    return roles.map(r => USER_ROLES.find(ur => ur.value === r)?.label || r).join(", ");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <Shield className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Approve, reject, or manage user access and roles
          </p>
        </div>
        
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as "pending" | "all")}>
          <SelectTrigger className="w-[180px]" data-testid="select-view-mode">
            <SelectValue placeholder="View mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Approvals</SelectItem>
            <SelectItem value="all">All Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold" data-testid="text-pending-count">
                {pendingUsers?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold" data-testid="text-approved-count">
                {allUsers?.filter(u => u.approvalStatus === "approved").length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-total-count">
                {allUsers?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "pending" ? "Pending Approval Requests" : "All Users"}
          </CardTitle>
          <CardDescription>
            {viewMode === "pending" 
              ? "Users waiting for account approval"
              : "Manage all registered users and their roles"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {viewMode === "pending" ? "No Pending Approvals" : "No Users Found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {viewMode === "pending" 
                  ? "All user requests have been processed."
                  : "No users are registered in the system."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover-elevate"
                  data-testid={`row-user-${user.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-user-name-${user.id}`}>
                        {user.displayName}
                      </span>
                      {getStatusBadge(user.approvalStatus)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registered: {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "Unknown"}
                      </span>
                    </div>
                    {user.roles && user.roles.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Roles: {getRoleLabels(user.roles as UserRole[])}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user.approvalStatus === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleRejectClick(user)}
                          data-testid={`button-reject-${user.id}`}
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => handleApproveClick(user)}
                          data-testid={`button-approve-${user.id}`}
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    ) : user.approvalStatus === "approved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRoles((user.roles as UserRole[]) || []);
                          setApproveDialogOpen(true);
                        }}
                        data-testid={`button-edit-roles-${user.id}`}
                      >
                        Edit Roles
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Access Denied
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.approvalStatus === "approved" ? "Edit User Roles" : "Approve User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.approvalStatus === "approved" 
                ? `Update roles for ${selectedUser?.displayName}`
                : `Assign roles to approve ${selectedUser?.displayName}'s access request.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedUser?.displayName}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
            </div>
            
            <div className="space-y-3">
              <Label>Assign Roles (select at least one)</Label>
              <div className="grid grid-cols-2 gap-3">
                {USER_ROLES.map((role) => (
                  <div 
                    key={role.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                      data-testid={`checkbox-role-${role.value}`}
                    />
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproveConfirm}
              disabled={selectedRoles.length === 0 || approveMutation.isPending || updateRolesMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {(approveMutation.isPending || updateRolesMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedUser?.approvalStatus === "approved" ? "Update Roles" : "Approve User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Access</DialogTitle>
            <DialogDescription>
              Deny {selectedUser?.displayName}'s access request. They will not be able to use the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedUser?.displayName}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
