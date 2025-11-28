import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Copy, Archive, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FormTemplate } from "@shared/schema";

const FORM_CATEGORIES = [
  "consent",
  "assessment", 
  "intake",
  "review",
  "incident",
  "checklist",
  "other"
] as const;

type FormCategory = typeof FORM_CATEGORIES[number];

const CATEGORY_LABELS: Record<FormCategory, string> = {
  consent: "Consent Forms",
  assessment: "Assessments",
  intake: "Intake Forms",
  review: "Review Forms",
  incident: "Incident Reports",
  checklist: "Checklists",
  other: "Other"
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

export default function FormTemplates() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "other" as FormCategory,
    status: "draft" as "active" | "draft" | "archived"
  });

  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"]
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      return apiRequest("POST", "/api/form-templates", {
        ...data,
        version: "1"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Form template created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FormTemplate> & { id: string }) => {
      return apiRequest("PATCH", `/api/form-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setEditingTemplate(null);
      toast({ title: "Template updated successfully" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template deleted successfully" });
    }
  });

  const resetForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      category: "other",
      status: "draft"
    });
  };

  const handleCreate = () => {
    if (!newTemplate.name) {
      toast({ title: "Please provide a template name", variant: "destructive" });
      return;
    }
    createTemplateMutation.mutate(newTemplate);
  };

  const handleDuplicate = (template: FormTemplate) => {
    setNewTemplate({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      category: (template.category || "other") as FormCategory,
      status: "draft"
    });
    setIsCreateDialogOpen(true);
  };

  const filteredTemplates = templates.filter(t => 
    selectedCategory === "all" || t.category === selectedCategory
  );

  const activeTemplates = filteredTemplates.filter(t => t.status === "active");
  const draftTemplates = filteredTemplates.filter(t => t.status === "draft");
  const archivedTemplates = filteredTemplates.filter(t => t.status === "archived");

  const TemplateCard = ({ template }: { template: FormTemplate }) => (
    <Card className="hover-elevate" data-testid={`template-card-${template.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{template.name}</CardTitle>
            <CardDescription className="text-sm line-clamp-2">
              {template.description || "No description"}
            </CardDescription>
          </div>
          <Badge className={STATUS_COLORS[template.status || "draft"]}>{template.status || "draft"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline">{CATEGORY_LABELS[(template.category || "other") as FormCategory]}</Badge>
            <span className="ml-2">v{template.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleDuplicate(template)}
              title="Duplicate"
              data-testid={`button-duplicate-${template.id}`}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingTemplate(template)}
              title="Edit"
              data-testid={`button-edit-${template.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            {template.status === "draft" && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => updateTemplateMutation.mutate({ id: template.id, status: "active" })}
                title="Activate"
                data-testid={`button-activate-${template.id}`}
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </Button>
            )}
            {template.status === "active" && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => updateTemplateMutation.mutate({ id: template.id, status: "archived" })}
                title="Archive"
                data-testid={`button-archive-${template.id}`}
              >
                <Archive className="w-4 h-4 text-gray-600" />
              </Button>
            )}
            {template.status !== "active" && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this template?")) {
                    deleteTemplateMutation.mutate(template.id);
                  }
                }}
                title="Delete"
                data-testid={`button-delete-${template.id}`}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">Form Templates</h1>
          <p className="text-muted-foreground">Create and manage customizable form templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
              <DialogDescription>Create a new form template to use for client documentation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input 
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g., Client Intake Form"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(v) => setNewTemplate({...newTemplate, category: v as FormCategory})}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Describe what this form is used for..."
                  data-testid="input-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button 
                onClick={handleCreate} 
                disabled={createTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {FORM_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeTemplates.length})</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({draftTemplates.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedTemplates.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            {activeTemplates.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active templates. Create one to get started.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="draft" className="mt-4">
            {draftTemplates.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No draft templates.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {draftTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            {archivedTemplates.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No archived templates.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Template Name</Label>
                <Input 
                  id="edit-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editingTemplate.category || "other"} 
                  onValueChange={(v) => setEditingTemplate({...editingTemplate, category: v as FormCategory})}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description"
                  value={editingTemplate.description || ""}
                  onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  data-testid="input-edit-description"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editingTemplate) {
                  updateTemplateMutation.mutate({
                    id: editingTemplate.id,
                    name: editingTemplate.name,
                    description: editingTemplate.description,
                    category: editingTemplate.category
                  });
                }
              }}
              disabled={updateTemplateMutation.isPending}
              data-testid="button-update-template"
            >
              {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
