import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, OrgDepartment, OrgPosition, StaffPositionAssignment, StaffProfileExtended } from "@shared/schema";
import {
  User, Mail, Phone, MapPin, Users, Settings2, X, Building2, Briefcase,
  Search, Filter, ChevronDown, ChevronRight, Plus, LayoutGrid, Network,
  Eye, History, Camera, Download, AlertTriangle, CheckCircle2, Clock,
  GraduationCap, FileCheck, Calendar
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

type ViewMode = "hierarchy" | "departments" | "positions" | "grid";

interface OcsStats {
  totalDepartments: number;
  totalPositions: number;
  vacantPositions: number;
  totalAssignments: number;
  activeStaff: number;
  complianceRate: number;
}

interface DepartmentWithDetails extends OrgDepartment {
  positions?: OrgPosition[];
  children?: DepartmentWithDetails[];
  staffCount?: number;
}

export default function OrgChart() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Dialog State
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStaffProfile, setShowStaffProfile] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");

  // New Department/Position Form
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptParent, setNewDeptParent] = useState<string>("");
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [newPositionDept, setNewPositionDept] = useState<string>("");

  // Queries
  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: departments = [], isLoading: deptsLoading } = useQuery<OrgDepartment[]>({
    queryKey: ["/api/ocs/departments"],
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery<OrgPosition[]>({
    queryKey: ["/api/ocs/positions"],
  });

  const { data: assignments = [] } = useQuery<StaffPositionAssignment[]>({
    queryKey: ["/api/ocs/assignments", { activeOnly: "true" }],
  });

  const { data: ocsStats } = useQuery<OcsStats>({
    queryKey: ["/api/ocs/stats"],
  });

  const { data: staffProfiles = [] } = useQuery<StaffProfileExtended[]>({
    queryKey: ["/api/ocs/staff-profiles"],
  });

  const { data: changeLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/ocs/change-logs", { limit: "10" }],
  });

  const isLoading = staffLoading || deptsLoading || positionsLoading;

  // Mutations
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
      toast({ title: "Success", description: "Supervisor assigned successfully" });
      setShowAssignDialog(false);
      setSelectedStaff(null);
      setSelectedSupervisor("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign supervisor", variant: "destructive" });
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
      toast({ title: "Success", description: "Supervisor removed successfully" });
      setShowAssignDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove supervisor", variant: "destructive" });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ocs/departments", {
        name: newDeptName,
        parentDepartmentId: newDeptParent || null,
        isActive: "yes",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ocs/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ocs/stats"] });
      toast({ title: "Success", description: "Department created successfully" });
      setShowCreateDept(false);
      setNewDeptName("");
      setNewDeptParent("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create department", variant: "destructive" });
    },
  });

  const createPositionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ocs/positions", {
        title: newPositionTitle,
        departmentId: newPositionDept || null,
        isActive: "yes",
        isVacant: "yes",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ocs/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ocs/stats"] });
      toast({ title: "Success", description: "Position created successfully" });
      setShowCreatePosition(false);
      setNewPositionTitle("");
      setNewPositionDept("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create position", variant: "destructive" });
    },
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ocs/snapshots", {
        name: `Snapshot - ${new Date().toLocaleDateString()}`,
        description: "Manual snapshot from org chart view",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Organization snapshot saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save snapshot", variant: "destructive" });
    },
  });

  // Helper Functions
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role?: string | null) => {
    if (!role) return "bg-gray-100 text-gray-700";
    const roleLower = role.toLowerCase();
    if (roleLower.includes("director") || roleLower.includes("ceo")) return "bg-purple-100 text-purple-700";
    if (roleLower.includes("manager")) return "bg-blue-100 text-blue-700";
    if (roleLower.includes("coordinator")) return "bg-green-100 text-green-700";
    if (roleLower.includes("nurse")) return "bg-red-100 text-red-700";
    if (roleLower.includes("support")) return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  const getComplianceColor = (status?: string) => {
    switch (status) {
      case "compliant": return "text-green-600 bg-green-50";
      case "warning": return "text-amber-600 bg-amber-50";
      case "non_compliant": return "text-red-600 bg-red-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  const getSupervisor = (staffMember: Staff) => staff.find((s) => s.id === staffMember.supervisorId);
  const getSubordinates = (staffMember: Staff) => staff.filter((s) => s.supervisorId === staffMember.id);

  const getStaffProfile = (staffId: string) => staffProfiles.find(p => p.staffId === staffId);
  const getStaffPosition = (staffId: string) => {
    const assignment = assignments.find(a => a.staffId === staffId && a.isPrimary === "yes");
    if (assignment) return positions.find(p => p.id === assignment.positionId);
    return undefined;
  };
  const getStaffDepartment = (staffId: string) => {
    const assignment = assignments.find(a => a.staffId === staffId && a.isPrimary === "yes");
    if (assignment?.departmentId) return departments.find(d => d.id === assignment.departmentId);
    return undefined;
  };

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (!showInactive && s.isActive !== "yes") return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterRole !== "all" && s.role !== filterRole) return false;
      if (filterDepartment !== "all") {
        const dept = getStaffDepartment(s.id);
        if (!dept || dept.id !== filterDepartment) return false;
      }
      return true;
    });
  }, [staff, showInactive, searchQuery, filterRole, filterDepartment, assignments, departments]);

  // Build department tree
  const departmentTree = useMemo(() => {
    const buildTree = (parentId: string | null): DepartmentWithDetails[] => {
      return departments
        .filter(d => d.parentDepartmentId === parentId)
        .map(dept => {
          const deptPositions = positions.filter(p => p.departmentId === dept.id);
          const deptAssignments = assignments.filter(a => a.departmentId === dept.id);
          return {
            ...dept,
            positions: deptPositions,
            children: buildTree(dept.id),
            staffCount: deptAssignments.length,
          };
        });
    };
    return buildTree(null);
  }, [departments, positions, assignments]);

  // Unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(staff.map(s => s.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [staff]);

  // Circular reference detection
  const wouldCreateCircularReference = (staffId: string, proposedSupervisorId: string): boolean => {
    const visited = new Set<string>();
    let currentId: string | null | undefined = proposedSupervisorId;
    while (currentId) {
      if (visited.has(currentId) || currentId === staffId) return true;
      visited.add(currentId);
      const current = staff.find(s => s.id === currentId);
      currentId = current?.supervisorId;
    }
    return false;
  };

  const getValidSupervisors = (staffMember: Staff) => {
    return staff.filter(s => {
      if (s.id === staffMember.id) return false;
      if (s.isActive !== "yes") return false;
      if (wouldCreateCircularReference(staffMember.id, s.id)) return false;
      return true;
    });
  };

  const detectCircularReferences = (): Staff[] => {
    const staffInCircles: Staff[] = [];
    for (const s of staff) {
      if (!s.supervisorId) continue;
      const visited = new Set<string>();
      let currentId: string | null | undefined = s.id;
      while (currentId) {
        if (visited.has(currentId)) {
          if (!staffInCircles.find(x => x.id === s.id)) staffInCircles.push(s);
          break;
        }
        visited.add(currentId);
        const current = staff.find(x => x.id === currentId);
        currentId = current?.supervisorId;
      }
    }
    return staffInCircles;
  };

  const circularRefStaff = detectCircularReferences();
  const rootStaff = staff.filter((s) => !s.supervisorId && s.isActive === "yes");

  // Enhanced Staff Card Component
  const StaffCard = ({ staffMember, compact = false, showActions = true }: {
    staffMember: Staff;
    compact?: boolean;
    showActions?: boolean;
  }) => {
    const subordinates = getSubordinates(staffMember);
    const supervisor = getSupervisor(staffMember);
    const profile = getStaffProfile(staffMember.id);
    const position = getStaffPosition(staffMember.id);
    const department = getStaffDepartment(staffMember.id);

    if (compact) {
      return (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedStaff(staffMember);
            setShowStaffProfile(true);
          }}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={staffMember.profileImageUrl || undefined} />
            <AvatarFallback className="text-sm">{getInitials(staffMember.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{staffMember.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {position?.title || staffMember.role || "Staff"}
            </p>
          </div>
          {profile?.complianceStatus && (
            <Badge variant="outline" className={cn("text-xs", getComplianceColor(profile.complianceStatus))}>
              {profile.complianceStatus === "compliant" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {profile.complianceStatus === "warning" && <Clock className="h-3 w-3 mr-1" />}
              {profile.complianceStatus === "non_compliant" && <AlertTriangle className="h-3 w-3 mr-1" />}
            </Badge>
          )}
        </div>
      );
    }

    return (
      <Card className="w-80 hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar
              className="h-16 w-16 border-2 border-primary/10 cursor-pointer"
              onClick={() => {
                setSelectedStaff(staffMember);
                setShowStaffProfile(true);
              }}
            >
              <AvatarImage src={staffMember.profileImageUrl || undefined} alt={staffMember.name} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                {getInitials(staffMember.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-base truncate cursor-pointer hover:text-primary"
                onClick={() => {
                  setSelectedStaff(staffMember);
                  setShowStaffProfile(true);
                }}
              >
                {staffMember.name}
              </h3>
              {position && (
                <p className="text-xs text-muted-foreground truncate">{position.title}</p>
              )}
              <Badge variant="secondary" className={`${getRoleColor(staffMember.role)} text-xs mt-1`}>
                {staffMember.role || "Staff Member"}
              </Badge>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setSelectedStaff(staffMember);
                    setShowStaffProfile(true);
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setSelectedStaff(staffMember);
                    setSelectedSupervisor(staffMember.supervisorId || "");
                    setShowAssignDialog(true);
                  }}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Supervisor
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/staff/${staffMember.id}`)}>
                    <User className="h-4 w-4 mr-2" />
                    Full Staff Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Department badge */}
          {department && (
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {department.name}
              </Badge>
            </div>
          )}

          {/* Contact details */}
          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            {staffMember.email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{staffMember.email}</span>
              </div>
            )}
            {staffMember.mobileNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{staffMember.mobileNumber}</span>
              </div>
            )}
            {staffMember.state && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{staffMember.state}</span>
              </div>
            )}
          </div>

          {/* Metrics row */}
          {profile && (
            <div className="grid grid-cols-3 gap-2 py-3 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{profile.currentClientCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Clients</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Active client assignments</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{profile.currentShiftCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Shifts</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Shifts this week</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("text-center rounded p-1", getComplianceColor(profile.complianceStatus))}>
                    {profile.complianceStatus === "compliant" && <CheckCircle2 className="h-4 w-4 mx-auto" />}
                    {profile.complianceStatus === "warning" && <Clock className="h-4 w-4 mx-auto" />}
                    {profile.complianceStatus === "non_compliant" && <AlertTriangle className="h-4 w-4 mx-auto" />}
                    <p className="text-xs">Compliance</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {profile.pendingTrainings || 0} pending, {profile.overdueTrainings || 0} overdue trainings
                </TooltipContent>
              </Tooltip>
            </div>
          )}

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
          {subordinates.length > 0 && (
            <div className="pt-3 border-t mt-3">
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-primary">
                  {subordinates.length} {subordinates.length === 1 ? "Direct Report" : "Direct Reports"}
                </span>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="pt-3 border-t mt-3">
            <Badge variant={staffMember.isActive === "yes" ? "default" : "secondary"} className="text-xs">
              {staffMember.isActive === "yes" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Department Card Component
  const DepartmentCard = ({ dept, level = 0 }: { dept: DepartmentWithDetails; level?: number }) => {
    const isExpanded = expandedDepts.has(dept.id);
    const toggleExpand = () => {
      const newExpanded = new Set(expandedDepts);
      if (isExpanded) {
        newExpanded.delete(dept.id);
      } else {
        newExpanded.add(dept.id);
      }
      setExpandedDepts(newExpanded);
    };

    const deptStaff = staff.filter(s => {
      const assignment = assignments.find(a => a.staffId === s.id && a.departmentId === dept.id && a.isActive === "yes");
      return !!assignment;
    });

    const head = dept.headOfDepartmentId ? staff.find(s => s.id === dept.headOfDepartmentId) : null;

    return (
      <div className={cn("", level > 0 && "ml-6 border-l-2 pl-4 border-muted")}>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dept.color || "#3B82F6" }}
                />
                <div>
                  <h3 className="font-semibold">{dept.name}</h3>
                  {dept.code && <p className="text-xs text-muted-foreground">{dept.code}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{deptStaff.length} staff</Badge>
                {dept.positions && <Badge variant="outline">{dept.positions.length} positions</Badge>}
                {(dept.children && dept.children.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={toggleExpand}>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Department head */}
            {head && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Head of Department</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{getInitials(head.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{head.name}</p>
                    <p className="text-xs text-muted-foreground">{head.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Staff list (collapsed by default) */}
            {isExpanded && deptStaff.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Team Members</p>
                {deptStaff.slice(0, 5).map(s => (
                  <StaffCard key={s.id} staffMember={s} compact showActions={false} />
                ))}
                {deptStaff.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{deptStaff.length - 5} more members
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Child departments */}
        {isExpanded && dept.children && dept.children.map(child => (
          <DepartmentCard key={child.id} dept={child} level={level + 1} />
        ))}
      </div>
    );
  };

  // Build hierarchy tree
  const buildHierarchy = (staffMember: Staff, level = 0, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(staffMember.id)) {
      return (
        <div key={`cycle-${staffMember.id}`} className="flex flex-col items-center">
          <Card className="w-80 border-2 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 text-center">
              <Badge variant="destructive" className="mb-2">Circular Reference</Badge>
              <p className="text-sm text-muted-foreground">
                {staffMember.name} appears multiple times. Please fix supervisor assignments.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const newVisited = new Set(visited);
    newVisited.add(staffMember.id);

    const subordinates = getSubordinates(staffMember);

    return (
      <div key={staffMember.id} className="flex flex-col items-center">
        <div className="mb-6">
          <StaffCard staffMember={staffMember} />
        </div>

        {subordinates.length > 0 && (
          <>
            <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-primary/20" />
            <div className="flex gap-8 relative">
              {subordinates.length > 1 && (
                <div className="absolute top-0 h-0.5 bg-primary/20" style={{ left: "40px", right: "40px" }} />
              )}
              {subordinates.map((sub) => (
                <div key={sub.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary/20 to-primary/10" />
                  {buildHierarchy(sub, level + 1, newVisited)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organisational chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                Organisational Chart
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Team hierarchy, departments, and reporting structure</p>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setShowCreateDept(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Department
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePosition(true)}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Position
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => createSnapshotMutation.mutate()}>
                    <Camera className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Snapshot</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Stats Cards */}
          {ocsStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{ocsStats.totalDepartments}</p>
                  <p className="text-xs text-muted-foreground">Departments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Briefcase className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{ocsStats.totalPositions}</p>
                  <p className="text-xs text-muted-foreground">Positions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{ocsStats.activeStaff}</p>
                  <p className="text-xs text-muted-foreground">Active Staff</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{ocsStats.vacantPositions}</p>
                  <p className="text-xs text-muted-foreground">Vacancies</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold">{ocsStats.complianceRate}%</p>
                  <p className="text-xs text-muted-foreground">Compliance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Network className="h-6 w-6 mx-auto mb-2 text-rose-500" />
                  <p className="text-2xl font-bold">{ocsStats.totalAssignments}</p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Circular Reference Warning */}
          {circularRefStaff.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">Circular Reporting Chain Detected</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      The following staff members have circular supervisor assignments:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {circularRefStaff.map((s) => (
                        <Badge
                          key={s.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedStaff(s);
                            setSelectedSupervisor(s.supervisorId || "");
                            setShowAssignDialog(true);
                          }}
                        >
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Mode Tabs & Filters */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="hierarchy" className="gap-2">
                  <Network className="h-4 w-4" />
                  Hierarchy
                </TabsTrigger>
                <TabsTrigger value="departments" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Departments
                </TabsTrigger>
                <TabsTrigger value="positions" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Positions
                </TabsTrigger>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Grid View
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>

                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role!}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {departments.length > 0 && (
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Hierarchy View */}
            <TabsContent value="hierarchy" className="mt-6">
              {rootStaff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No staff members found at the top level</p>
                </div>
              ) : (
                <div className="flex justify-center gap-12 pb-8 overflow-x-auto">
                  {rootStaff.map((member) => buildHierarchy(member))}
                </div>
              )}
            </TabsContent>

            {/* Departments View */}
            <TabsContent value="departments" className="mt-6">
              {departmentTree.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No departments configured yet</p>
                  <Button onClick={() => setShowCreateDept(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Department
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentTree.map(dept => (
                    <DepartmentCard key={dept.id} dept={dept} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Positions View */}
            <TabsContent value="positions" className="mt-6">
              {positions.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No positions configured yet</p>
                  <Button onClick={() => setShowCreatePosition(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Position
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {positions.map(position => {
                    const dept = departments.find(d => d.id === position.departmentId);
                    const posAssignments = assignments.filter(a => a.positionId === position.id && a.isActive === "yes");
                    const assignedStaff = posAssignments.map(a => staff.find(s => s.id === a.staffId)).filter(Boolean);

                    return (
                      <Card key={position.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{position.title}</h3>
                              {dept && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {dept.name}
                                </p>
                              )}
                            </div>
                            <Badge variant={position.isVacant === "yes" ? "destructive" : "default"}>
                              {position.isVacant === "yes" ? "Vacant" : "Filled"}
                            </Badge>
                          </div>

                          {position.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {position.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {posAssignments.length}/{position.maxHeadcount || 1} filled
                            </span>
                          </div>

                          {assignedStaff.length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {assignedStaff.map((s: any) => (
                                <div key={s.id} className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{s.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Grid View */}
            <TabsContent value="grid" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStaff.map(member => (
                  <StaffCard key={member.id} staffMember={member} />
                ))}
              </div>
              {filteredStaff.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No staff members match your filters</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
              {selectedStaff && <span>Configure supervisor for <strong>{selectedStaff.name}</strong></span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedStaff?.supervisorId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Supervisor:</p>
                <p className="font-medium">{staff.find((s) => s.id === selectedStaff.supervisorId)?.name}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{selectedStaff?.supervisorId ? "Change Supervisor" : "Assign Supervisor"}</Label>
              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {selectedStaff && getValidSupervisors(selectedStaff).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.role && <span className="text-xs text-muted-foreground">({s.role})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Staff who would create a circular chain are hidden.
              </p>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              {selectedStaff?.supervisorId && (
                <Button
                  variant="outline"
                  onClick={() => selectedStaff && removeSupervisorMutation.mutate(selectedStaff.id)}
                  disabled={removeSupervisorMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
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

      {/* Staff Profile Dialog */}
      <Dialog open={showStaffProfile} onOpenChange={setShowStaffProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedStaff.profileImageUrl || undefined} />
                  <AvatarFallback className="text-2xl">{getInitials(selectedStaff.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{selectedStaff.name}</h2>
                  <Badge className={getRoleColor(selectedStaff.role)}>{selectedStaff.role || "Staff"}</Badge>
                  {getStaffPosition(selectedStaff.id) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getStaffPosition(selectedStaff.id)?.title}
                    </p>
                  )}
                  {getStaffDepartment(selectedStaff.id) && (
                    <Badge variant="outline" className="mt-2">
                      <Building2 className="h-3 w-3 mr-1" />
                      {getStaffDepartment(selectedStaff.id)?.name}
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setLocation(`/staff/${selectedStaff.id}`)}>
                  Full Profile
                </Button>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedStaff.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStaff.email}</span>
                  </div>
                )}
                {selectedStaff.mobileNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStaff.mobileNumber}</span>
                  </div>
                )}
                {selectedStaff.state && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStaff.state}</span>
                  </div>
                )}
              </div>

              {/* Metrics */}
              {(() => {
                const profile = getStaffProfile(selectedStaff.id);
                if (!profile) return null;
                return (
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xl font-bold">{profile.currentClientCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Clients</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xl font-bold">{profile.currentShiftCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Shifts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <GraduationCap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                        <p className="text-xl font-bold">{profile.pendingTrainings || 0}</p>
                        <p className="text-xs text-muted-foreground">Pending Training</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <FileCheck className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xl font-bold">{profile.policiesAcknowledged || 0}</p>
                        <p className="text-xs text-muted-foreground">Policies Ack'd</p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Reporting Structure */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Reporting Structure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Reports To</p>
                    {getSupervisor(selectedStaff) ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(getSupervisor(selectedStaff)!.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{getSupervisor(selectedStaff)!.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No supervisor assigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Direct Reports ({getSubordinates(selectedStaff).length})
                    </p>
                    <div className="space-y-2">
                      {getSubordinates(selectedStaff).slice(0, 3).map(sub => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{getInitials(sub.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{sub.name}</span>
                        </div>
                      ))}
                      {getSubordinates(selectedStaff).length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{getSubordinates(selectedStaff).length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Department Dialog */}
      <Dialog open={showCreateDept} onOpenChange={setShowCreateDept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
            <DialogDescription>Add a new department to the organization structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Department Name</Label>
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g., Human Resources"
              />
            </div>
            <div>
              <Label>Parent Department (Optional)</Label>
              <Select value={newDeptParent} onValueChange={setNewDeptParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Root Level)</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDept(false)}>Cancel</Button>
            <Button
              onClick={() => createDepartmentMutation.mutate()}
              disabled={!newDeptName || createDepartmentMutation.isPending}
            >
              {createDepartmentMutation.isPending ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Position Dialog */}
      <Dialog open={showCreatePosition} onOpenChange={setShowCreatePosition}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Position</DialogTitle>
            <DialogDescription>Add a new position to the organization structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Position Title</Label>
              <Input
                value={newPositionTitle}
                onChange={(e) => setNewPositionTitle(e.target.value)}
                placeholder="e.g., Senior Care Coordinator"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={newPositionDept} onValueChange={setNewPositionDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Department</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePosition(false)}>Cancel</Button>
            <Button
              onClick={() => createPositionMutation.mutate()}
              disabled={!newPositionTitle || createPositionMutation.isPending}
            >
              {createPositionMutation.isPending ? "Creating..." : "Create Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
