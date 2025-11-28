import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskComment, TaskChecklist, Staff, Client } from "@shared/schema";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  CheckSquare,
  Square,
  Send,
  Trash2,
  X,
  Flag,
  Users,
  FileText,
  Target,
  Briefcase,
  GraduationCap,
  CalendarClock,
  MoreHorizontal,
  Edit,
  ListTodo,
  Repeat,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "not_started" | "in_progress" | "completed" | "cancelled";
type TaskCategory = "general" | "client_care" | "documentation" | "compliance" | "training" | "meeting" | "follow_up" | "other";

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: typeof Flag }> = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Flag },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Flag },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: Flag },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: AlertCircle },
};

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: typeof Circle }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Circle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", icon: X },
};

const categoryConfig: Record<TaskCategory, { label: string; icon: typeof FileText }> = {
  general: { label: "General", icon: FileText },
  client_care: { label: "Client Care", icon: Users },
  documentation: { label: "Documentation", icon: FileText },
  compliance: { label: "Compliance", icon: CheckSquare },
  training: { label: "Training", icon: GraduationCap },
  meeting: { label: "Meeting", icon: CalendarClock },
  follow_up: { label: "Follow Up", icon: Target },
  other: { label: "Other", icon: Briefcase },
};

export default function Tasks() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Recurrence pattern type
  type RecurrencePattern = "daily" | "weekly" | "fortnightly" | "monthly" | "custom" | "";

  // Form state for new task
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "general" as TaskCategory,
    priority: "medium" as TaskPriority,
    dueDate: "",
    assignedToId: "",
    assignedToName: "",
    clientId: "",
    clientName: "",
    isRecurring: "no" as "yes" | "no",
    recurrencePattern: "" as RecurrencePattern,
    recurrenceEndDate: "",
  });

  // Queries
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: assignedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
  });

  const { data: myTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
  });

  const { data: selectedTask } = useQuery<Task>({
    queryKey: ["/api/tasks", selectedTaskId],
    enabled: !!selectedTaskId,
  });

  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ["/api/tasks", selectedTaskId, "comments"],
    enabled: !!selectedTaskId,
  });

  const { data: checklists = [] } = useQuery<TaskChecklist[]>({
    queryKey: ["/api/tasks", selectedTaskId, "checklists"],
    enabled: !!selectedTaskId,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      return apiRequest("POST", "/api/tasks", {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        clientId: taskData.clientId || null,
        clientName: taskData.clientName || null,
        assignedToId: taskData.assignedToId || null,
        assignedToName: taskData.assignedToName || null,
        recurrencePattern: taskData.recurrencePattern || null,
        recurrenceEndDate: taskData.recurrenceEndDate ? new Date(taskData.recurrenceEndDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({ title: "Task created", description: "Your task has been created successfully" });
      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        category: "general",
        priority: "medium",
        dueDate: "",
        assignedToId: "",
        assignedToName: "",
        clientId: "",
        clientName: "",
        isRecurring: "no",
        recurrencePattern: "",
        recurrenceEndDate: "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({ title: "Task updated", description: "The task has been updated" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/complete`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({ title: "Task completed!", description: "Great job!" });
      setShowCompleteDialog(false);
      setCompletionNotes("");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({ title: "Task deleted", description: "The task has been removed" });
      setSelectedTaskId(null);
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ id, assignedToId, assignedToName }: { id: string; assignedToId: string; assignedToName: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/assign`, { assignedToId, assignedToName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId] });
      toast({ title: "Task assigned", description: "The task has been assigned" });
      setShowAssignDialog(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      return apiRequest("POST", `/api/tasks/${taskId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId, "comments"] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
  });

  const addChecklistMutation = useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      return apiRequest("POST", `/api/tasks/${taskId}/checklists`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId, "checklists"] });
      setNewChecklistItem("");
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ taskId, checklistId, isCompleted }: { taskId: string; checklistId: string; isCompleted: "yes" | "no" }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/checklists/${checklistId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId, "checklists"] });
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: async ({ taskId, checklistId }: { taskId: string; checklistId: string }) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}/checklists/${checklistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId, "checklists"] });
    },
  });

  // Get filtered tasks based on active tab
  const getDisplayTasks = () => {
    let baseTasks: Task[] = [];
    switch (activeTab) {
      case "assigned":
        baseTasks = assignedTasks;
        break;
      case "created":
        baseTasks = myTasks;
        break;
      default:
        baseTasks = tasks;
    }
    return baseTasks;
  };

  // Filter tasks
  const filteredTasks = getDisplayTasks().filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !["completed", "cancelled"].includes(task.status)) ||
      task.status === statusFilter;

    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort tasks: urgent/high priority first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority as TaskPriority] !== priorityOrder[b.priority as TaskPriority]) {
      return priorityOrder[a.priority as TaskPriority] - priorityOrder[b.priority as TaskPriority];
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Stats
  const stats = {
    total: tasks.length,
    notStarted: tasks.filter((t) => t.status === "not_started").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.dueDate && isBefore(new Date(t.dueDate), new Date()) && t.status !== "completed").length,
  };

  const isOverdue = (task: Task) =>
    task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== "completed";

  const isDueSoon = (task: Task) =>
    task.dueDate &&
    isAfter(new Date(task.dueDate), new Date()) &&
    isBefore(new Date(task.dueDate), addDays(new Date(), 2)) &&
    task.status !== "completed";

  return (
    <div className="flex h-full">
      {/* Left Panel - Task List */}
      <div className="w-[400px] border-r flex flex-col bg-background">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Tasks</h2>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-xl font-bold">{stats.notStarted}</div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-all-tasks">All</TabsTrigger>
              <TabsTrigger value="assigned" className="flex-1" data-testid="tab-assigned-tasks">Assigned to Me</TabsTrigger>
              <TabsTrigger value="created" className="flex-1" data-testid="tab-my-tasks">Created by Me</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tasks"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="flex-1" data-testid="select-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tasks found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create a task to get started"}
                </p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const StatusIcon = statusConfig[task.status as TaskStatus]?.icon || Circle;
                const isSelected = selectedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                      isSelected
                        ? "bg-accent border-primary/30"
                        : "hover-elevate border-transparent"
                    }`}
                    onClick={() => setSelectedTaskId(task.id)}
                    data-testid={`task-item-${task.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle
                            className={`h-5 w-5 ${
                              task.priority === "urgent"
                                ? "text-red-500"
                                : task.priority === "high"
                                ? "text-orange-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-medium truncate ${
                              task.status === "completed" ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${priorityConfig[task.priority as TaskPriority]?.color}`}>
                            {priorityConfig[task.priority as TaskPriority]?.label}
                          </Badge>
                          {task.clientName && (
                            <Badge variant="secondary" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {task.clientName}
                            </Badge>
                          )}
                          {isOverdue(task) && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          )}
                          {isDueSoon(task) && !isOverdue(task) && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Due Soon</Badge>
                          )}
                        </div>
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 mt-1.5 text-xs ${
                            isOverdue(task) ? "text-red-500" : "text-muted-foreground"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        {task.assignedToName && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assignedToName}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Task Details */}
      <div className="flex-1 flex flex-col">
        {selectedTask ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTask.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center cursor-pointer hover:bg-green-50 dark:hover:bg-green-950 transition-colors ${
                      selectedTask.priority === "urgent"
                        ? "border-red-500"
                        : selectedTask.priority === "high"
                        ? "border-orange-500"
                        : "border-muted-foreground"
                    }`}
                    onClick={() => setShowCompleteDialog(true)}
                  />
                )}
                <div>
                  <h3 className={`font-semibold text-lg ${selectedTask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {selectedTask.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Task #{selectedTask.taskNumber}</span>
                    <span>·</span>
                    <span>Created {formatDistanceToNow(new Date(selectedTask.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTask.status !== "completed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignDialog(true)}
                      data-testid="button-assign-task"
                    >
                      <User className="h-4 w-4 mr-1" />
                      {selectedTask.assignedToName ? "Reassign" : "Assign"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowCompleteDialog(true)}
                      data-testid="button-complete-task"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-task-menu">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        updateTaskMutation.mutate({
                          id: selectedTask.id,
                          updates: { status: selectedTask.status === "in_progress" ? "not_started" : "in_progress" }
                        });
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {selectedTask.status === "in_progress" ? "Mark Not Started" : "Mark In Progress"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateTaskMutation.mutate({ id: selectedTask.id, updates: { status: "cancelled" } })}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Task
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this task?")) {
                          deleteTaskMutation.mutate(selectedTask.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Status and Priority */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Status:</Label>
                    <Badge className={statusConfig[selectedTask.status as TaskStatus]?.color}>
                      {statusConfig[selectedTask.status as TaskStatus]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Priority:</Label>
                    <Badge className={priorityConfig[selectedTask.priority as TaskPriority]?.color}>
                      {priorityConfig[selectedTask.priority as TaskPriority]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Category:</Label>
                    <Badge variant="outline">
                      {categoryConfig[selectedTask.category as TaskCategory]?.label}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedTask.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">Due Date</Label>
                      <p className={`mt-1 text-sm flex items-center gap-1 ${isOverdue(selectedTask) ? "text-red-500" : ""}`}>
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedTask.dueDate), "MMMM d, yyyy")}
                        {isOverdue(selectedTask) && " (Overdue)"}
                      </p>
                    </div>
                  )}
                  {selectedTask.assignedToName && (
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {selectedTask.assignedToName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{selectedTask.assignedToName}</span>
                      </div>
                    </div>
                  )}
                  {selectedTask.clientName && (
                    <div>
                      <Label className="text-muted-foreground">Related Client</Label>
                      <p className="mt-1 text-sm flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedTask.clientName}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Created By</Label>
                    <p className="mt-1 text-sm">{selectedTask.createdByName}</p>
                  </div>
                </div>

                {selectedTask.status === "completed" && selectedTask.completedAt && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Completed</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      by {selectedTask.completedByName} on {format(new Date(selectedTask.completedAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    {selectedTask.completionNotes && (
                      <p className="text-sm mt-2 text-green-700 dark:text-green-300">{selectedTask.completionNotes}</p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Checklist ({checklists.filter((c) => c.isCompleted === "yes").length}/{checklists.length})
                    </Label>
                  </div>
                  <div className="space-y-2">
                    {checklists.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <Checkbox
                          checked={item.isCompleted === "yes"}
                          onCheckedChange={(checked) => {
                            toggleChecklistMutation.mutate({
                              taskId: selectedTask.id,
                              checklistId: item.id,
                              isCompleted: checked ? "yes" : "no",
                            });
                          }}
                          data-testid={`checklist-item-${item.id}`}
                        />
                        <span className={`flex-1 text-sm ${item.isCompleted === "yes" ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteChecklistMutation.mutate({ taskId: selectedTask.id, checklistId: item.id })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Add checklist item..."
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newChecklistItem.trim()) {
                            addChecklistMutation.mutate({ taskId: selectedTask.id, title: newChecklistItem.trim() });
                          }
                        }}
                        className="flex-1"
                        data-testid="input-new-checklist-item"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newChecklistItem.trim()) {
                            addChecklistMutation.mutate({ taskId: selectedTask.id, title: newChecklistItem.trim() });
                          }
                        }}
                        disabled={!newChecklistItem.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({comments.length})
                  </Label>
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {comment.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="flex-1"
                        data-testid="input-new-comment"
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (newComment.trim() && selectedTaskId) {
                            commentMutation.mutate({ taskId: selectedTaskId, content: newComment.trim() });
                          }
                        }}
                        disabled={!newComment.trim() || commentMutation.isPending}
                        data-testid="button-send-comment"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a task</p>
              <p className="text-sm">Choose a task from the list to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to track</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="mt-1"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Add more details..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                className="mt-1"
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newTask.category}
                  onValueChange={(v) => setNewTask({ ...newTask, category: v as TaskCategory })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-task-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="mt-1"
                data-testid="input-task-due-date"
              />
            </div>
            
            {/* Recurring Task Options */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Recurring Task</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={newTask.isRecurring === "no" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setNewTask({ ...newTask, isRecurring: "no", recurrencePattern: "", recurrenceEndDate: "" })}
                    data-testid="button-recurring-no"
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant={newTask.isRecurring === "yes" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setNewTask({ ...newTask, isRecurring: "yes" })}
                    data-testid="button-recurring-yes"
                  >
                    Yes
                  </Button>
                </div>
              </div>
              
              {newTask.isRecurring === "yes" && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label className="text-sm">Repeat Every *</Label>
                    <Select
                      value={newTask.recurrencePattern}
                      onValueChange={(v) => setNewTask({ ...newTask, recurrencePattern: v as RecurrencePattern })}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-recurrence-pattern">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly (Every 2 weeks)</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {newTask.isRecurring === "yes" && !newTask.recurrencePattern && (
                      <p className="text-xs text-destructive mt-1">Please select a frequency</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="task-recurrence-end">End Recurrence (Optional)</Label>
                    <Input
                      id="task-recurrence-end"
                      type="date"
                      value={newTask.recurrenceEndDate}
                      onChange={(e) => setNewTask({ ...newTask, recurrenceEndDate: e.target.value })}
                      className="mt-1"
                      data-testid="input-recurrence-end-date"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for indefinite recurrence
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Assign To (Optional)</Label>
              <Select
                value={newTask.assignedToId}
                onValueChange={(v) => {
                  const member = staff.find((s) => (s.userId || s.id) === v);
                  setNewTask({
                    ...newTask,
                    assignedToId: v,
                    assignedToName: member?.name || "",
                  });
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-task-assignee">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.filter((s) => s.name).map((member) => (
                    <SelectItem key={member.id} value={member.userId || member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Client (Optional)</Label>
              <Select
                value={newTask.clientId}
                onValueChange={(v) => {
                  const client = clients.find((c) => c.id === v);
                  setNewTask({
                    ...newTask,
                    clientId: v,
                    clientName: client?.participantName || "",
                  });
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-task-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.slice(0, 50).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.participantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate(newTask)}
              disabled={
                !newTask.title.trim() || 
                createTaskMutation.isPending ||
                (newTask.isRecurring === "yes" && !newTask.recurrencePattern)
              }
              data-testid="button-submit-task"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>Select a staff member to assign this task to</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {staff.filter((s) => s.name).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                onClick={() => {
                  if (selectedTaskId) {
                    assignTaskMutation.mutate({
                      id: selectedTaskId,
                      assignedToId: member.userId || member.id,
                      assignedToName: member.name || "Unknown",
                    });
                  }
                }}
                data-testid={`assign-task-to-${member.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {(member.name || "??").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>Add any notes about the completion (optional)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="completion-notes">Completion Notes</Label>
            <Textarea
              id="completion-notes"
              placeholder="Any final notes or comments..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
              className="mt-2"
              data-testid="input-completion-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTaskId) {
                  completeTaskMutation.mutate({ id: selectedTaskId, notes: completionNotes || undefined });
                }
              }}
              disabled={completeTaskMutation.isPending}
              data-testid="button-confirm-complete"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
