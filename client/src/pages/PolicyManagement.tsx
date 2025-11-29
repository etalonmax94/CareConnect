import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIWritingAssistant, AIWritingButton } from "@/components/AIWritingAssistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  FileCheck,
  History,
  Bell,
  Download,
  Send,
  RefreshCw,
  Calendar,
  X,
  Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Policy {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  category: string;
  policyType: string | null;
  tags: string | null;
  departmentTags: string | null;
  version: number;
  versionNotes: string | null;
  status: string;
  publishedAt: string | null;
  publishedById: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  expiryDate: string | null;
  isMandatory: string;
  requiresReacknowledgment: string;
  reacknowledgmentPeriodDays: number | null;
  acknowledgmentDeadlineDays: number;
  audienceType: string;
  viewCount: number;
  acknowledgmentCount: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string | null;
}

interface PolicyStats {
  totalPolicies: number;
  publishedPolicies: number;
  totalAssignments: number;
  acknowledgedCount: number;
  overdueCount: number;
  complianceRate: number;
}

interface StaffPolicyAssignment {
  id: string;
  staffId: string;
  staffName: string | null;
  policyId: string;
  policyVersion: number;
  assignedAt: string;
  dueDate: string | null;
  status: string;
  isOverdue: string;
}

interface PolicyAuditLog {
  id: string;
  policyId: string | null;
  staffId: string | null;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  description: string | null;
  timestamp: string;
}

interface PolicyCategory {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number | null;
  isActive: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
  pending_review: "bg-blue-100 text-blue-700",
};

const CATEGORY_COLORS: Record<string, string> = {
  HR: "bg-purple-100 text-purple-700",
  Safety: "bg-red-100 text-red-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Operations: "bg-blue-100 text-blue-700",
  Clinical: "bg-pink-100 text-pink-700",
  IT: "bg-cyan-100 text-cyan-700",
  Legal: "bg-amber-100 text-amber-700",
  Quality: "bg-indigo-100 text-indigo-700",
  General: "bg-slate-100 text-slate-700",
};

const DEFAULT_CATEGORIES = [
  "HR", "Safety", "Finance", "Operations", "Clinical", "IT", "Legal", "Quality", "General"
];

export default function PolicyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("policies");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiPolicyOpen, setAiPolicyOpen] = useState(false);

  // Form state for creating/editing policies
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "General",
    policyType: "general",
    isMandatory: "no",
    audienceType: "all_staff",
    acknowledgmentDeadlineDays: 7,
    requiresReacknowledgment: "no",
    reacknowledgmentPeriodDays: 365,
    effectiveDate: "",
    reviewDate: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    fileSize: 0,
  });

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch policies
  const { data: policies = [], isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ["/api/pms/policies", statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      const response = await fetch(`/api/pms/policies?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch policies");
      return response.json();
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<PolicyStats>({
    queryKey: ["/api/pms/stats"],
    queryFn: async () => {
      const response = await fetch("/api/pms/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery<PolicyAuditLog[]>({
    queryKey: ["/api/pms/recent-activity"],
    queryFn: async () => {
      const response = await fetch("/api/pms/recent-activity?limit=10");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  // Fetch overdue assignments
  const { data: overdueAssignments = [] } = useQuery<StaffPolicyAssignment[]>({
    queryKey: ["/api/pms/assignments/overdue"],
    queryFn: async () => {
      const response = await fetch("/api/pms/assignments/overdue");
      if (!response.ok) throw new Error("Failed to fetch overdue assignments");
      return response.json();
    },
  });

  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/pms/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create policy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pms/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pms/stats"] });
      toast({ title: "Policy created successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create policy", variant: "destructive" });
    },
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/pms/policies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update policy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pms/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pms/stats"] });
      toast({ title: "Policy updated successfully" });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      setSelectedPolicy(null);
    },
    onError: () => {
      toast({ title: "Failed to update policy", variant: "destructive" });
    },
  });

  // Publish policy mutation
  const publishPolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pms/policies/${id}/publish`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to publish policy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pms/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pms/stats"] });
      toast({ title: "Policy published successfully" });
    },
    onError: () => {
      toast({ title: "Failed to publish policy", variant: "destructive" });
    },
  });

  // Archive policy mutation
  const archivePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pms/policies/${id}/archive`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to archive policy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pms/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pms/stats"] });
      toast({ title: "Policy archived successfully" });
    },
    onError: () => {
      toast({ title: "Failed to archive policy", variant: "destructive" });
    },
  });

  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pms/policies/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete policy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pms/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pms/stats"] });
      toast({ title: "Policy deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete policy", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      category: "General",
      policyType: "general",
      isMandatory: "no",
      audienceType: "all_staff",
      acknowledgmentDeadlineDays: 7,
      requiresReacknowledgment: "no",
      reacknowledgmentPeriodDays: 365,
      effectiveDate: "",
      reviewDate: "",
      fileUrl: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
    });
    setUploadError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PDF, Word, Excel, and text files are allowed");
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/pms/policies/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      setFormData(prev => ({
        ...prev,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.fileSize,
      }));
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      toast({ title: "Failed to upload file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const removeUploadedFile = () => {
    setFormData(prev => ({
      ...prev,
      fileUrl: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
    }));
  };

  const handleCreatePolicy = () => {
    createPolicyMutation.mutate(formData);
  };

  const handleUpdatePolicy = () => {
    if (!selectedPolicy) return;
    updatePolicyMutation.mutate({ id: selectedPolicy.id, data: formData });
  };

  const handleViewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setFormData({
      title: policy.title,
      description: policy.description || "",
      content: policy.content || "",
      category: policy.category,
      policyType: policy.policyType || "general",
      isMandatory: policy.isMandatory,
      audienceType: policy.audienceType,
      acknowledgmentDeadlineDays: policy.acknowledgmentDeadlineDays,
      requiresReacknowledgment: policy.requiresReacknowledgment,
      reacknowledgmentPeriodDays: policy.reacknowledgmentPeriodDays || 365,
      effectiveDate: policy.effectiveDate || "",
      reviewDate: policy.reviewDate || "",
      fileUrl: policy.fileUrl || "",
      fileName: policy.fileName || "",
      fileType: policy.fileType || "",
      fileSize: policy.fileSize || 0,
    });
    setIsEditMode(false);
    setIsViewDialogOpen(true);
  };

  const filteredPolicies = policies.filter((policy) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        policy.title.toLowerCase().includes(term) ||
        policy.description?.toLowerCase().includes(term) ||
        policy.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Policy Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage company policies, track compliance, and monitor staff acknowledgments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Policy</DialogTitle>
              <DialogDescription>
                Create a new policy document for staff acknowledgment
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Policy Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Code of Conduct"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the policy..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="isMandatory">Mandatory</Label>
                  <Select
                    value={formData.isMandatory}
                    onValueChange={(value) => setFormData({ ...formData, isMandatory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="audienceType">Target Audience</Label>
                  <Select
                    value={formData.audienceType}
                    onValueChange={(value) => setFormData({ ...formData, audienceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_staff">All Staff</SelectItem>
                      <SelectItem value="specific_roles">Specific Roles</SelectItem>
                      <SelectItem value="specific_departments">Specific Departments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="acknowledgmentDeadlineDays">Acknowledgment Deadline (days)</Label>
                  <Input
                    id="acknowledgmentDeadlineDays"
                    type="number"
                    value={formData.acknowledgmentDeadlineDays}
                    onChange={(e) =>
                      setFormData({ ...formData, acknowledgmentDeadlineDays: parseInt(e.target.value) || 7 })
                    }
                    min={1}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Policy Document (PDF/Word/Excel)</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {formData.fileUrl ? (
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{formData.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(formData.fileSize)}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeUploadedFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        type="file"
                        id="policy-file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="policy-file"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-muted-foreground">
                              PDF, Word, Excel, or Text (max 50MB)
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  {uploadError && (
                    <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Policy Content (Optional if document uploaded)</Label>
                  <AIWritingButton onClick={() => setAiPolicyOpen(true)} />
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter additional policy content or leave empty if using uploaded document..."
                  rows={6}
                />
              </div>
              <AIWritingAssistant
                open={aiPolicyOpen}
                onOpenChange={setAiPolicyOpen}
                initialContent={formData.content}
                initialContext="policy"
                onApply={(text) => setFormData({ ...formData, content: text })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reviewDate">Review Date</Label>
                  <Input
                    id="reviewDate"
                    type="date"
                    value={formData.reviewDate}
                    onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresReacknowledgment"
                    checked={formData.requiresReacknowledgment === "yes"}
                    onChange={(e) =>
                      setFormData({ ...formData, requiresReacknowledgment: e.target.checked ? "yes" : "no" })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="requiresReacknowledgment" className="text-sm">
                    Requires periodic re-acknowledgment
                  </Label>
                </div>
                {formData.requiresReacknowledgment === "yes" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Every</Label>
                    <Input
                      type="number"
                      value={formData.reacknowledgmentPeriodDays}
                      onChange={(e) =>
                        setFormData({ ...formData, reacknowledgmentPeriodDays: parseInt(e.target.value) || 365 })
                      }
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePolicy} disabled={!formData.title || createPolicyMutation.isPending}>
                {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPolicies || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.publishedPolicies || 0} published
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignments || 0}</div>
            <p className="text-xs text-muted-foreground">Total staff assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.acknowledgedCount || 0}</div>
            <p className="text-xs text-muted-foreground">Completed acknowledgments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.overdueCount || 0}</div>
            <p className="text-xs text-muted-foreground">Past deadline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.complianceRate || 0}%</div>
            <Progress value={stats?.complianceRate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="policies">
            <FileText className="h-4 w-4 mr-2" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Policies Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Policy</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Acknowledgments</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policiesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading policies...
                      </TableCell>
                    </TableRow>
                  ) : filteredPolicies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No policies found. Create your first policy to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{policy.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {policy.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={CATEGORY_COLORS[policy.category] || CATEGORY_COLORS.General}>
                            {policy.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[policy.status] || STATUS_COLORS.draft}>
                            {policy.status.replace("_", " ")}
                          </Badge>
                          {policy.isMandatory === "yes" && (
                            <Badge variant="outline" className="ml-1 text-red-600 border-red-200">
                              Mandatory
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>v{policy.version}</TableCell>
                        <TableCell>{policy.viewCount}</TableCell>
                        <TableCell>{policy.acknowledgmentCount}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(policy.updatedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPolicy(policy)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  handleViewPolicy(policy);
                                  setIsEditMode(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {policy.status === "draft" && (
                                <DropdownMenuItem
                                  onClick={() => publishPolicyMutation.mutate(policy.id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {policy.status !== "archived" && (
                                <DropdownMenuItem
                                  onClick={() => archivePolicyMutation.mutate(policy.id)}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this policy?")) {
                                    deletePolicyMutation.mutate(policy.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Overdue Acknowledgments
                </CardTitle>
                <CardDescription>Staff who have not acknowledged policies by the deadline</CardDescription>
              </CardHeader>
              <CardContent>
                {overdueAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    All staff are up to date!
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {overdueAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                        >
                          <div>
                            <div className="font-medium">{assignment.staffName || "Unknown Staff"}</div>
                            <div className="text-sm text-muted-foreground">
                              Due: {assignment.dueDate ? format(new Date(assignment.dueDate), "PP") : "No deadline"}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2" />
                            Remind
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Compliance by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Overview
                </CardTitle>
                <CardDescription>Policy compliance status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Assignments</span>
                    <span className="font-bold">{stats?.totalAssignments || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      Acknowledged
                    </span>
                    <span className="font-bold text-green-600">{stats?.acknowledgedCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      Overdue
                    </span>
                    <span className="font-bold text-red-600">{stats?.overdueCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    <span className="font-bold text-amber-600">
                      {(stats?.totalAssignments || 0) - (stats?.acknowledgedCount || 0) - (stats?.overdueCount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest policy management actions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity to display
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {recentActivity.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {log.action === "created" && <Plus className="h-4 w-4 text-primary" />}
                          {log.action === "updated" && <Edit className="h-4 w-4 text-blue-500" />}
                          {log.action === "published" && <Send className="h-4 w-4 text-green-500" />}
                          {log.action === "acknowledged" && <Check className="h-4 w-4 text-green-500" />}
                          {log.action === "viewed" && <Eye className="h-4 w-4 text-gray-500" />}
                          {log.action === "archived" && <Archive className="h-4 w-4 text-amber-500" />}
                          {log.action === "deleted" && <Trash2 className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{log.description || log.action}</div>
                          <div className="text-sm text-muted-foreground">
                            by {log.userName || "System"} •{" "}
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View/Edit Policy Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Policy" : "View Policy"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the policy details below" : "Policy details and content"}
            </DialogDescription>
          </DialogHeader>
          {selectedPolicy && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge className={STATUS_COLORS[selectedPolicy.status]}>
                  {selectedPolicy.status.replace("_", " ")}
                </Badge>
                <Badge className={CATEGORY_COLORS[selectedPolicy.category]}>
                  {selectedPolicy.category}
                </Badge>
                {selectedPolicy.isMandatory === "yes" && (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    Mandatory
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground ml-auto">Version {selectedPolicy.version}</span>
              </div>

              {isEditMode ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Policy Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Mandatory</Label>
                      <Select
                        value={formData.isMandatory}
                        onValueChange={(value) => setFormData({ ...formData, isMandatory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Policy Content</Label>
                      <AIWritingButton onClick={() => setAiPolicyOpen(true)} />
                    </div>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={10}
                    />
                  </div>
                  <AIWritingAssistant
                    open={aiPolicyOpen}
                    onOpenChange={setAiPolicyOpen}
                    initialContent={formData.content}
                    initialContext="policy"
                    onApply={(text) => setFormData({ ...formData, content: text })}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedPolicy.title}</h3>
                    {selectedPolicy.description && (
                      <p className="text-muted-foreground mt-1">{selectedPolicy.description}</p>
                    )}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">{format(new Date(selectedPolicy.createdAt), "PPp")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="ml-2">{format(new Date(selectedPolicy.updatedAt), "PPp")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Views:</span>
                      <span className="ml-2">{selectedPolicy.viewCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Acknowledgments:</span>
                      <span className="ml-2">{selectedPolicy.acknowledgmentCount}</span>
                    </div>
                  </div>
                  {selectedPolicy.fileUrl && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Attached Document</h4>
                        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{selectedPolicy.fileName}</div>
                              <div className="text-sm text-muted-foreground">
                                {selectedPolicy.fileType?.toUpperCase().replace('APPLICATION/', '')} • {selectedPolicy.fileSize ? formatFileSize(selectedPolicy.fileSize) : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(selectedPolicy.fileUrl!, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              asChild
                            >
                              <a href={selectedPolicy.fileUrl!} download={selectedPolicy.fileName}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Policy Content</h4>
                    <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
                      {selectedPolicy.content || (selectedPolicy.fileUrl ? "See attached document above" : "No content available")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePolicy} disabled={updatePolicyMutation.isPending}>
                  {updatePolicyMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setIsEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
