import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Target, Plus, Loader2, Clock, TrendingUp, CheckCircle, AlertTriangle, Calendar, 
  MoreVertical, Pencil, Copy, Archive, Trash2, ChevronDown, ChevronRight, 
  Heart, Users, Shield, DollarSign, Sparkles, FileText, MessageSquare,
  Filter, ArrowUpDown, RotateCcw, User, CalendarDays, History
} from "lucide-react";
import type { ClientGoal, GoalUpdate, Staff, GoalCategory, GoalStatus } from "@shared/schema";

interface GoalsTabProps {
  clientId: string;
  isArchived: boolean;
}

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: typeof Heart; color: string; bgColor: string }> = {
  health: { label: "Health", icon: Heart, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  social: { label: "Social", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  independence: { label: "Independence", icon: Sparkles, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
  safety: { label: "Safety", icon: Shield, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  financial: { label: "Financial", icon: DollarSign, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  other: { label: "Other", icon: Target, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800" },
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; borderColor: string; icon: typeof Clock }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", borderColor: "border-l-slate-400", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", borderColor: "border-l-teal-500", icon: TrendingUp },
  achieved: { label: "Achieved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", borderColor: "border-l-emerald-500", icon: CheckCircle },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", borderColor: "border-l-amber-500", icon: AlertTriangle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", borderColor: "border-l-slate-300", icon: Archive },
};

export default function GoalsTab({ clientId, isArchived }: GoalsTabProps) {
  const { toast } = useToast();
  
  // State for dialogs
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ClientGoal | null>(null);
  
  // Form states
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalStatus, setGoalStatus] = useState<GoalStatus>("not_started");
  const [goalCategory, setGoalCategory] = useState<GoalCategory>("other");
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalResponsibleStaff, setGoalResponsibleStaff] = useState<string>("none");
  const [goalNextReviewDate, setGoalNextReviewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  
  // Inline edit states
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState("");
  const [inlineEditDescription, setInlineEditDescription] = useState("");
  
  // Filter/sort states
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "progress" | "status">("date");
  const [showArchived, setShowArchived] = useState(false);
  
  // Queries
  const { data: goals = [], isLoading: goalsLoading } = useQuery<ClientGoal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: !!clientId,
  });
  
  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });
  
  const { data: goalUpdates = [] } = useQuery<GoalUpdate[]>({
    queryKey: ["/api/goals", selectedGoal?.id, "updates"],
    enabled: !!selectedGoal?.id && notesOpen,
  });
  
  // Mutations
  const addGoalMutation = useMutation({
    mutationFn: async (data: Partial<ClientGoal>) => {
      return apiRequest("POST", `/api/clients/${clientId}/goals`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      resetForm();
      setAddGoalOpen(false);
      toast({ title: "Goal added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add goal", description: error?.message || "Please try again", variant: "destructive" });
    }
  });
  
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientGoal> }) => {
      return apiRequest("PATCH", `/api/goals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      setEditGoalOpen(false);
      setInlineEditingId(null);
      toast({ title: "Goal updated" });
    },
    onError: () => {
      toast({ title: "Failed to update goal", variant: "destructive" });
    }
  });
  
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      setDeleteConfirmOpen(false);
      setSelectedGoal(null);
      toast({ title: "Goal deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    }
  });
  
  const duplicateGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/goals/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({ title: "Goal duplicated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to duplicate goal", description: error?.message, variant: "destructive" });
    }
  });
  
  const archiveGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/goals/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({ title: "Goal archived" });
    },
    onError: () => {
      toast({ title: "Failed to archive goal", variant: "destructive" });
    }
  });
  
  const unarchiveGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/goals/${id}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      toast({ title: "Goal restored" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to restore goal", description: error?.message, variant: "destructive" });
    }
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async ({ goalId, note }: { goalId: string; note: string }) => {
      return apiRequest("POST", `/api/goals/${goalId}/updates`, {
        updateType: "note",
        note
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", selectedGoal?.id, "updates"] });
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  });
  
  // Helper functions
  const resetForm = () => {
    setGoalTitle("");
    setGoalDescription("");
    setGoalTargetDate("");
    setGoalStatus("not_started");
    setGoalCategory("other");
    setGoalProgress(0);
    setGoalResponsibleStaff("none");
    setGoalNextReviewDate("");
  };
  
  const openEditDialog = (goal: ClientGoal) => {
    setSelectedGoal(goal);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || "");
    setGoalTargetDate(goal.targetDate || "");
    setGoalStatus(goal.status);
    setGoalCategory(goal.category || "other");
    setGoalProgress(goal.progressPercent || 0);
    setGoalResponsibleStaff(goal.responsibleStaffId || "none");
    setGoalNextReviewDate(goal.nextReviewDate || "");
    setEditGoalOpen(true);
  };
  
  const startInlineEdit = (goal: ClientGoal) => {
    setInlineEditingId(goal.id);
    setInlineEditTitle(goal.title);
    setInlineEditDescription(goal.description || "");
  };
  
  const saveInlineEdit = () => {
    if (!inlineEditingId) return;
    updateGoalMutation.mutate({
      id: inlineEditingId,
      data: { title: inlineEditTitle, description: inlineEditDescription || undefined }
    });
  };
  
  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditTitle("");
    setInlineEditDescription("");
  };
  
  const getStaffById = (staffId: string | null) => {
    if (!staffId) return null;
    return staffList.find(s => s.id === staffId);
  };
  
  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const isOverdue = (goal: ClientGoal) => {
    if (!goal.targetDate || goal.status === "achieved" || goal.status === "archived") return false;
    const days = getDaysRemaining(goal.targetDate);
    return days !== null && days < 0;
  };
  
  // Computed values
  const activeGoals = useMemo(() => goals.filter(g => g.isArchived !== "yes" && g.status !== "archived"), [goals]);
  const archivedGoals = useMemo(() => goals.filter(g => g.isArchived === "yes" || g.status === "archived"), [goals]);
  const achievedGoals = useMemo(() => activeGoals.filter(g => g.status === "achieved"), [activeGoals]);
  const inProgressGoals = useMemo(() => activeGoals.filter(g => g.status !== "achieved"), [activeGoals]);
  
  const overallProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const total = activeGoals.reduce((sum, g) => sum + (g.progressPercent || 0), 0);
    return Math.round(total / activeGoals.length);
  }, [activeGoals]);
  
  const overdueCount = useMemo(() => activeGoals.filter(isOverdue).length, [activeGoals]);
  
  // Filter and sort goals
  const filteredGoals = useMemo(() => {
    let filtered = showArchived ? archivedGoals : inProgressGoals;
    
    if (filterCategory !== "all") {
      filtered = filtered.filter(g => (g.category || "other") === filterCategory);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return (b.progressPercent || 0) - (a.progressPercent || 0);
        case "status":
          const statusOrder = ["in_progress", "not_started", "on_hold", "achieved", "archived"];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        case "date":
        default:
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }
    });
  }, [inProgressGoals, archivedGoals, showArchived, filterCategory, sortBy]);
  
  if (goalsLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Stats Header */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{activeGoals.length}</div>
              <div className="text-xs text-muted-foreground">Active Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{achievedGoals.length}</div>
              <div className="text-xs text-muted-foreground">Achieved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{inProgressGoals.filter(g => g.status === "in_progress").length}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>{overdueCount}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="text-2xl font-bold">{overallProgress}%</div>
                <Progress value={overallProgress} className="w-16 h-2" />
              </div>
              <div className="text-xs text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Goals Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Client Goals ({activeGoals.length}/5)
            </CardTitle>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filters */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className={`w-3 h-3 ${config.color}`} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="progress">By Progress</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="h-8 text-xs"
              >
                <Archive className="w-3 h-3 mr-1" />
                {showArchived ? "Show Active" : "Show Archived"}
              </Button>
              
              {!isArchived && activeGoals.length < 5 && (
                <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-goal">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add New Goal</DialogTitle>
                      <DialogDescription>Create a new goal to track progress and outcomes for this client.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label>Goal Title *</Label>
                        <Input 
                          placeholder="Enter goal title..." 
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                          data-testid="input-goal-title"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                          placeholder="Describe the goal in detail..." 
                          value={goalDescription}
                          onChange={(e) => setGoalDescription(e.target.value)}
                          rows={3}
                          data-testid="input-goal-description"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={goalCategory} onValueChange={(v) => setGoalCategory(v as GoalCategory)}>
                            <SelectTrigger data-testid="select-goal-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    <config.icon className={`w-3 h-3 ${config.color}`} />
                                    {config.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={goalStatus} onValueChange={(v) => setGoalStatus(v as GoalStatus)}>
                            <SelectTrigger data-testid="select-goal-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="achieved">Achieved</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Target Date</Label>
                          <Input 
                            type="date" 
                            value={goalTargetDate}
                            onChange={(e) => setGoalTargetDate(e.target.value)}
                            data-testid="input-goal-target-date"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Next Review Date</Label>
                          <Input 
                            type="date" 
                            value={goalNextReviewDate}
                            onChange={(e) => setGoalNextReviewDate(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Progress ({goalProgress}%)</Label>
                        <Slider
                          value={[goalProgress]}
                          onValueChange={(v) => setGoalProgress(v[0])}
                          max={100}
                          step={5}
                          className="py-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Responsible Staff</Label>
                        <Select value={goalResponsibleStaff} onValueChange={setGoalResponsibleStaff}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No assignment</SelectItem>
                            {staffList.filter(s => s.isActive === "yes").map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                <span className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  {staff.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          addGoalMutation.mutate({ 
                            title: goalTitle, 
                            description: goalDescription || undefined,
                            targetDate: goalTargetDate || undefined,
                            status: goalStatus,
                            category: goalCategory,
                            progressPercent: goalProgress,
                            responsibleStaffId: goalResponsibleStaff && goalResponsibleStaff !== "none" ? goalResponsibleStaff : undefined,
                            nextReviewDate: goalNextReviewDate || undefined,
                          });
                        }}
                        disabled={!goalTitle.trim() || addGoalMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-goal"
                      >
                        {addGoalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Goal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {!isArchived && activeGoals.length >= 5 && (
                <Badge variant="secondary" className="gap-1 text-muted-foreground">
                  <CheckCircle className="w-3 h-3" />
                  Maximum goals reached
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredGoals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/30 flex items-center justify-center">
                <Target className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {showArchived ? "No archived goals" : "No goals yet"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {showArchived 
                  ? "Archived goals will appear here when you archive active goals."
                  : "Set meaningful goals to track progress and outcomes for this client. Goals help measure success and guide care planning."}
              </p>
              {!isArchived && !showArchived && (
                <Button 
                  onClick={() => setAddGoalOpen(true)} 
                  className="mt-4"
                  data-testid="button-add-first-goal"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Goal
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Achieved Goals Section */}
              {!showArchived && achievedGoals.length > 0 && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-sm">Achieved Goals ({achievedGoals.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-3">
                    {achievedGoals.map((goal) => renderGoalCard(goal))}
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {/* Active/Archived Goals */}
              <div className="space-y-3">
                {filteredGoals.filter(g => showArchived || g.status !== "achieved").map((goal) => renderGoalCard(goal))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Goal Dialog */}
      <Dialog open={editGoalOpen} onOpenChange={setEditGoalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>Update goal details, progress, and assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Goal Title *</Label>
              <Input 
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={goalCategory} onValueChange={(v) => setGoalCategory(v as GoalCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <config.icon className={`w-3 h-3 ${config.color}`} />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={goalStatus} onValueChange={(v) => setGoalStatus(v as GoalStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input 
                  type="date" 
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Next Review Date</Label>
                <Input 
                  type="date" 
                  value={goalNextReviewDate}
                  onChange={(e) => setGoalNextReviewDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Progress ({goalProgress}%)</Label>
              <Slider
                value={[goalProgress]}
                onValueChange={(v) => setGoalProgress(v[0])}
                max={100}
                step={5}
                className="py-2"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Responsible Staff</Label>
              <Select value={goalResponsibleStaff} onValueChange={setGoalResponsibleStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {staffList.filter(s => s.isActive === "yes").map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <span className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {staff.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGoalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedGoal) {
                  updateGoalMutation.mutate({
                    id: selectedGoal.id,
                    data: {
                      title: goalTitle,
                      description: goalDescription || undefined,
                      targetDate: goalTargetDate || undefined,
                      status: goalStatus,
                      category: goalCategory,
                      progressPercent: goalProgress,
                      responsibleStaffId: goalResponsibleStaff && goalResponsibleStaff !== "none" ? goalResponsibleStaff : undefined,
                      nextReviewDate: goalNextReviewDate || undefined,
                    }
                  });
                }
              }}
              disabled={!goalTitle.trim() || updateGoalMutation.isPending}
            >
              {updateGoalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedGoal?.title}". This action cannot be undone.
              Consider archiving the goal instead if you want to keep a record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedGoal && deleteGoalMutation.mutate(selectedGoal.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGoalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Notes/Updates Panel */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Goal History & Notes
            </DialogTitle>
            <DialogDescription>{selectedGoal?.title}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Note */}
            {!isArchived && (
              <div className="space-y-2">
                <Label>Add Note</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a note or update..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newNote.trim() && selectedGoal) {
                        addNoteMutation.mutate({ goalId: selectedGoal.id, note: newNote });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newNote.trim() && selectedGoal) {
                        addNoteMutation.mutate({ goalId: selectedGoal.id, note: newNote });
                      }
                    }}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Updates List */}
            <ScrollArea className="h-[300px]">
              {goalUpdates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goalUpdates.map((update) => (
                    <div key={update.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="text-xs mb-1">
                            {update.updateType.replace("_", " ")}
                          </Badge>
                          {update.note && (
                            <p className="text-sm">{update.note}</p>
                          )}
                          {update.previousValue && update.newValue && (
                            <p className="text-xs text-muted-foreground">
                              Changed from {update.previousValue} to {update.newValue}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{update.performedByName || "System"}</span>
                        <span>•</span>
                        <span>{new Date(update.createdAt).toLocaleDateString("en-AU")} {new Date(update.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  function renderGoalCard(goal: ClientGoal) {
    const status = STATUS_CONFIG[goal.status] || STATUS_CONFIG.not_started;
    const category = CATEGORY_CONFIG[(goal.category as GoalCategory) || "other"];
    const CategoryIcon = category.icon;
    const StatusIcon = status.icon;
    const daysRemaining = getDaysRemaining(goal.targetDate);
    const goalIsOverdue = isOverdue(goal);
    const responsibleStaff = getStaffById(goal.responsibleStaffId);
    const isEditing = inlineEditingId === goal.id;
    const isGoalArchived = goal.isArchived === "yes" || goal.status === "archived";
    
    return (
      <div 
        key={goal.id} 
        className={`p-4 border rounded-lg bg-card border-l-4 ${status.borderColor} ${goalIsOverdue ? "ring-1 ring-red-300 dark:ring-red-800" : ""}`}
        data-testid={`goal-${goal.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header with title and badges */}
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              {isEditing ? (
                <Input
                  value={inlineEditTitle}
                  onChange={(e) => setInlineEditTitle(e.target.value)}
                  className="h-7 text-sm font-medium"
                  autoFocus
                />
              ) : (
                <div className="group flex items-center gap-1">
                  <h4 
                    className="font-medium text-sm cursor-text hover:text-primary transition-colors"
                    onClick={() => !isGoalArchived && !isArchived && startInlineEdit(goal)}
                  >
                    {goal.title}
                  </h4>
                  {!isArchived && !isGoalArchived && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-5 w-5 opacity-60 hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); startInlineEdit(goal); }}
                      data-testid={`button-inline-edit-${goal.id}`}
                      aria-label="Edit goal title and description"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-1 flex-wrap">
                <Badge className={`${status.color} gap-1`} variant="secondary">
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
                
                <Badge variant="outline" className={`gap-1 text-xs ${category.color}`}>
                  <CategoryIcon className="w-3 h-3" />
                  {category.label}
                </Badge>
                
                {goalIsOverdue && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Description */}
            {isEditing ? (
              <Textarea
                value={inlineEditDescription}
                onChange={(e) => setInlineEditDescription(e.target.value)}
                className="text-sm mt-1"
                rows={2}
                placeholder="Add description..."
              />
            ) : goal.description ? (
              <p 
                className="text-sm text-muted-foreground mt-1 cursor-text hover:text-foreground/80 transition-colors"
                onClick={() => !isArchived && !isGoalArchived && startInlineEdit(goal)}
              >
                {goal.description}
              </p>
            ) : !isArchived && !isGoalArchived ? (
              <button 
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground mt-1 italic cursor-text"
                onClick={() => startInlineEdit(goal)}
              >
                Click to add description...
              </button>
            ) : null}
            
            {/* Inline edit buttons */}
            {isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={saveInlineEdit} disabled={updateGoalMutation.isPending}>
                  {updateGoalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelInlineEdit}>Cancel</Button>
              </div>
            )}
            
            {/* Progress bar */}
            {!isEditing && goal.progressPercent !== null && goal.progressPercent !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{goal.progressPercent}%</span>
                </div>
                <Progress value={goal.progressPercent} className="h-2" />
              </div>
            )}
            
            {/* Meta info row */}
            {!isEditing && (
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                {goal.targetDate && (
                  <span className={`flex items-center gap-1 ${goalIsOverdue ? "text-red-600 font-medium" : daysRemaining !== null && daysRemaining <= 7 ? "text-amber-600" : ""}`}>
                    <Calendar className="w-3 h-3" />
                    {goalIsOverdue 
                      ? `${Math.abs(daysRemaining!)} days overdue`
                      : daysRemaining === 0 
                        ? "Due today"
                        : daysRemaining === 1
                          ? "Due tomorrow"
                          : `${daysRemaining} days remaining`
                    }
                  </span>
                )}
                
                {goal.nextReviewDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    Review: {new Date(goal.nextReviewDate).toLocaleDateString("en-AU")}
                  </span>
                )}
                
                {responsibleStaff && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 cursor-pointer">
                        <Avatar className="w-4 h-4">
                          <AvatarFallback className="text-[8px]">
                            {responsibleStaff.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {responsibleStaff.name.split(" ")[0]}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Responsible: {responsibleStaff.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          {!isArchived && !isEditing && (
            <div className="flex items-center gap-1">
              {/* Quick status change */}
              <Select 
                value={goal.status} 
                onValueChange={(v) => updateGoalMutation.mutate({ id: goal.id, data: { status: v as GoalStatus } })}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs" data-testid={`select-goal-status-${goal.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Action menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-goal-actions-${goal.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(goal)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedGoal(goal); setNotesOpen(true); }}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => duplicateGoalMutation.mutate(goal.id)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {isGoalArchived ? (
                    <DropdownMenuItem onClick={() => unarchiveGoalMutation.mutate(goal.id)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => archiveGoalMutation.mutate(goal.id)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => { setSelectedGoal(goal); setDeleteConfirmOpen(true); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  }
}
