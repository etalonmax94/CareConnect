import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProviderType, providerConfig } from "./AddProviderDialog";

interface EditProviderDialogProps {
  providerType: ProviderType;
  provider: Record<string, any>;
  onSuccess?: (provider: any) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  triggerVariant?: "default" | "ghost" | "outline" | "secondary" | "destructive";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

type FormData = Record<string, string>;

export function EditProviderDialog({ 
  providerType, 
  provider,
  onSuccess, 
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "icon",
}: EditProviderDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  
  const config = providerConfig[providerType];

  const getInitialFormData = useCallback((): FormData => {
    return config.fields.reduce((acc, field) => {
      const value = provider[field];
      if (value !== undefined && value !== null) {
        acc[field] = String(value);
      } else if (field === "deliveryAvailable") {
        acc[field] = "no";
      } else if (field === "isActive") {
        acc[field] = "yes";
      } else if (field === "role") {
        acc[field] = "support_worker";
      } else {
        acc[field] = "";
      }
      return acc;
    }, {} as FormData);
  }, [config.fields, provider]);
  
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData());
  
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, getInitialFormData]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("PATCH", `${config.endpoint}/${provider.id}`, data),
    onSuccess: (updatedProvider) => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      queryClient.invalidateQueries({ queryKey: [config.queryKey, provider.id] });
      setIsOpen(false);
      const entityName = config.title.replace("Add New ", "");
      toast({ title: `${entityName} updated successfully` });
      if (onSuccess) {
        onSuccess(updatedProvider);
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: `Failed to update ${config.title.replace("Add New ", "").toLowerCase()}`, 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const field of config.requiredFields) {
      if (!formData[field]?.trim()) {
        toast({ 
          title: `${config.labels[field as keyof typeof config.labels]} is required`, 
          variant: "destructive" 
        });
        return;
      }
    }
    
    updateMutation.mutate(formData);
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData(getInitialFormData());
  };

  const renderField = (field: string) => {
    const label = config.labels[field as keyof typeof config.labels] || field;
    const placeholder = config.placeholders?.[field as keyof typeof config.placeholders] || "";
    const isRequired = config.requiredFields.includes(field);

    if (field === "specialty" && providerType === "alliedHealth") {
      const specialties = (config as typeof providerConfig.alliedHealth).specialties;
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label} {isRequired && "*"}</Label>
          <Select
            value={formData[field] || ""}
            onValueChange={(value) => setFormData({ ...formData, [field]: value })}
          >
            <SelectTrigger data-testid={`select-edit-provider-${field}`}>
              <SelectValue placeholder="Select specialty..." />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === "role" && providerType === "staff") {
      const roles = (config as typeof providerConfig.staff).roles;
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Select
            value={formData[field] || "support_worker"}
            onValueChange={(value) => setFormData({ ...formData, [field]: value })}
          >
            <SelectTrigger data-testid={`select-edit-provider-${field}`}>
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === "deliveryAvailable") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Select
            value={formData[field] || "no"}
            onValueChange={(value) => setFormData({ ...formData, [field]: value })}
          >
            <SelectTrigger data-testid={`select-edit-provider-${field}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === "isActive") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Select
            value={formData[field] || "yes"}
            onValueChange={(value) => setFormData({ ...formData, [field]: value })}
          >
            <SelectTrigger data-testid={`select-edit-provider-${field}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Active</SelectItem>
              <SelectItem value="no">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === "notes" || field === "address") {
      return (
        <div key={field} className="space-y-2 col-span-2">
          <Label htmlFor={field}>{label} {isRequired && "*"}</Label>
          <Textarea
            id={field}
            value={formData[field] || ""}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            placeholder={placeholder}
            rows={field === "notes" ? 3 : 2}
            data-testid={`input-edit-provider-${field}`}
          />
        </div>
      );
    }

    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>{label} {isRequired && "*"}</Label>
        <Input
          id={field}
          type={field === "email" ? "email" : "text"}
          value={formData[field] || ""}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          placeholder={placeholder}
          required={isRequired}
          data-testid={`input-edit-provider-${field}`}
        />
      </div>
    );
  };

  const editTitle = config.title.replace("Add New", "Edit");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button 
            type="button" 
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
            data-testid={`button-edit-${providerType}-${provider.id}`}
          >
            {triggerSize === "icon" ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTitle}</DialogTitle>
          <DialogDescription>Update the {config.title.replace("Add New ", "").toLowerCase()} details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {config.fields.map(renderField)}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
