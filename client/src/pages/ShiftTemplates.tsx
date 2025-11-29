import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ClipboardList, Plus, Search, Edit, Trash2, Copy, Clock, Users, CheckSquare,
  MoreHorizontal, Loader2, LayoutTemplate, Calendar
} from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ScheduleTaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  shiftType?: string;
  tasks: { name: string; description?: string; isRequired: boolean }[];
  estimatedDurationMinutes?: number;
  requiredQualifications?: string[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskItem {
  name: string;
  description?: string;
  isRequired: boolean;
}

const CATEGORIES = ["NDIS", "Support at Home", "Private"];
const SHIFT_TYPES = [
  "Morning Support",
  "Afternoon Support",
  "Evening Support",
  "Overnight Support",
  "Personal Care",
  "Community Access",
  "Transport",
  "Respite",
  "SIL Support",
  "Nursing",
  "Therapy",
  "Other"
];

const QUALIFICATIONS = [
  "First Aid",
  "CPR",
  "Manual Handling",
  "Medication Administration",
  "Behaviour Support",
  "Complex Care",
  "NDIS Worker Screening",
  "Working With Children Check",
  "Driver's License"
];

export default function ShiftTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTaskTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "NDIS",
    shiftType: "",
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    estimatedDurationMinutes: 480,
    requiredQualifications: [] as string[],
    tasks: [] as TaskItem[],
    isActive: true,
  });

  const [newTask, setNewTask] = useState({ name: "", description: "", isRequired: false });

  // Queries
  const { data: templates = [], isLoading } = useQuery<ScheduleTaskTemplate[]>({
    queryKey: ["/api/ascs/task-templates"],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/ascs/task-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/ascs/task-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template updated successfully" });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ascs/task-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "NDIS",
      shiftType: "",
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
      estimatedDurationMinutes: 480,
      requiredQualifications: [],
      tasks: [],
      isActive: true,
    });
    setNewTask({ name: "", description: "", isRequired: false });
  };

  const handleEdit = (template: ScheduleTaskTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      shiftType: template.shiftType || "",
      defaultStartTime: template.defaultStartTime || "09:00",
      defaultEndTime: template.defaultEndTime || "17:00",
      estimatedDurationMinutes: template.estimatedDurationMinutes || 480,
      requiredQualifications: template.requiredQualifications || [],
      tasks: template.tasks || [],
      isActive: template.isActive,
    });
    setIsEditOpen(true);
  };

  const handleDuplicate = (template: ScheduleTaskTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      category: template.category,
      shiftType: template.shiftType || "",
      defaultStartTime: template.defaultStartTime || "09:00",
      defaultEndTime: template.defaultEndTime || "17:00",
      estimatedDurationMinutes: template.estimatedDurationMinutes || 480,
      requiredQualifications: template.requiredQualifications || [],
      tasks: template.tasks || [],
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const addTask = () => {
    if (!newTask.name.trim()) return;
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...newTask }]
    }));
    setNewTask({ name: "", description: "", isRequired: false });
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const toggleQualification = (qual: string) => {
    setFormData(prev => ({
      ...prev,
      requiredQualifications: prev.requiredQualifications.includes(qual)
        ? prev.requiredQualifications.filter(q => q !== qual)
        : [...prev.requiredQualifications, qual]
    }));
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const renderTemplateForm = (isEdit: boolean) => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Morning Personal Care Routine"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this template is for..."
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="shiftType">Shift Type</Label>
          <Select
            value={formData.shiftType}
            onValueChange={(v) => setFormData(prev => ({ ...prev, shiftType: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {SHIFT_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="startTime">Default Start Time</Label>
          <TimePicker
            id="startTime"
            value={formData.defaultStartTime}
            onChange={(value) => setFormData(prev => ({ ...prev, defaultStartTime: value }))}
            placeholder="Start time"
            minuteStep={15}
          />
        </div>

        <div>
          <Label htmlFor="endTime">Default End Time</Label>
          <TimePicker
            id="endTime"
            value={formData.defaultEndTime}
            onChange={(value) => setFormData(prev => ({ ...prev, defaultEndTime: value }))}
            placeholder="End time"
            minuteStep={15}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="duration">Estimated Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="15"
            max="1440"
            step="15"
            value={formData.estimatedDurationMinutes}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedDurationMinutes: parseInt(e.target.value) || 60 }))}
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="mb-2 block">Required Qualifications</Label>
        <div className="flex flex-wrap gap-2">
          {QUALIFICATIONS.map(qual => (
            <Badge
              key={qual}
              variant={formData.requiredQualifications.includes(qual) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleQualification(qual)}
            >
              {qual}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="mb-2 block">Task Checklist</Label>

        <div className="space-y-2 mb-4">
          {formData.tasks.map((task, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <CheckSquare className={cn(
                "w-4 h-4",
                task.isRequired ? "text-red-500" : "text-muted-foreground"
              )} />
              <div className="flex-1">
                <div className="text-sm font-medium">{task.name}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground">{task.description}</div>
                )}
              </div>
              {task.isRequired && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeTask(index)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Task name"
            value={newTask.name}
            onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1"
          />
          <Input
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewTask(prev => ({ ...prev, isRequired: !prev.isRequired }))}
            className={cn(newTask.isRequired && "border-red-500 text-red-500")}
          >
            {newTask.isRequired ? "Required" : "Optional"}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={addTask}
            disabled={!newTask.name.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
            Shift Templates
          </h1>
          <p className="text-muted-foreground">
            Create reusable shift templates with task checklists
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <LayoutTemplate className="w-12 h-12 mb-3" />
              <p>No templates found</p>
              <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                Create your first template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Shift Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.shiftType || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(template.estimatedDurationMinutes || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckSquare className="w-3 h-3" />
                        {template.tasks?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.usageCount} times
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              Create Shift Template
            </DialogTitle>
            <DialogDescription>
              Create a reusable template with predefined settings and task checklist
            </DialogDescription>
          </DialogHeader>

          {renderTemplateForm(false)}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Template
            </DialogTitle>
            <DialogDescription>
              Update the template settings and task checklist
            </DialogDescription>
          </DialogHeader>

          {renderTemplateForm(true)}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedTemplate(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedTemplate && updateMutation.mutate({ id: selectedTemplate.id, data: formData })}
              disabled={!formData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
