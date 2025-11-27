import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
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

export type ProviderType = "gp" | "pharmacy" | "planManager" | "supportCoordinator" | "alliedHealth" | "staff";

interface AddProviderDialogProps {
  providerType: ProviderType;
  onSuccess?: (provider: any) => void;
  triggerClassName?: string;
  defaultValues?: Record<string, string>;
}

const providerConfig = {
  gp: {
    title: "Add New GP",
    description: "Add a new General Practitioner to your contacts",
    endpoint: "/api/gps",
    queryKey: "/api/gps",
    fields: ["name", "practiceName", "phoneNumber", "faxNumber", "email", "address", "notes"],
    requiredFields: ["name"],
    labels: {
      name: "Doctor Name",
      practiceName: "Practice Name",
      phoneNumber: "Phone Number",
      faxNumber: "Fax Number",
      email: "Email",
      address: "Address",
      notes: "Notes",
    },
    placeholders: {
      name: "Dr. John Smith",
      practiceName: "Smith Medical Centre",
      phoneNumber: "02 XXXX XXXX",
      faxNumber: "02 XXXX XXXX",
      email: "doctor@practice.com.au",
      address: "123 Main Street, Sydney NSW 2000",
      notes: "Any additional notes...",
    },
  },
  pharmacy: {
    title: "Add New Pharmacy",
    description: "Add a new pharmacy to your contacts",
    endpoint: "/api/pharmacies",
    queryKey: "/api/pharmacies",
    fields: ["name", "phoneNumber", "faxNumber", "email", "address", "deliveryAvailable", "notes"],
    requiredFields: ["name"],
    labels: {
      name: "Pharmacy Name",
      phoneNumber: "Phone Number",
      faxNumber: "Fax Number",
      email: "Email",
      address: "Address",
      deliveryAvailable: "Delivery Available",
      notes: "Notes",
    },
    placeholders: {
      name: "ABC Pharmacy",
      phoneNumber: "02 XXXX XXXX",
      faxNumber: "02 XXXX XXXX",
      email: "pharmacy@example.com.au",
      address: "456 High Street, Sydney NSW 2000",
      notes: "Any additional notes...",
    },
  },
  planManager: {
    title: "Add New Plan Manager",
    description: "Add a new plan manager to your contacts",
    endpoint: "/api/plan-managers",
    queryKey: "/api/plan-managers",
    fields: ["name", "organisation", "email", "phoneNumber", "address"],
    requiredFields: ["name"],
    labels: {
      name: "Contact Name",
      organisation: "Organisation",
      email: "Email",
      phoneNumber: "Phone Number",
      address: "Address",
    },
    placeholders: {
      name: "Jane Smith",
      organisation: "Plan Management Co",
      email: "contact@planmanager.com.au",
      phoneNumber: "02 XXXX XXXX",
      address: "789 Business Ave, Melbourne VIC 3000",
    },
  },
  supportCoordinator: {
    title: "Add New Support Coordinator",
    description: "Add a new support coordinator to your contacts",
    endpoint: "/api/support-coordinators",
    queryKey: "/api/support-coordinators",
    fields: ["name", "organisation", "email", "phoneNumber", "address"],
    requiredFields: ["name"],
    labels: {
      name: "Contact Name",
      organisation: "Organisation",
      email: "Email",
      phoneNumber: "Phone Number",
      address: "Address",
    },
    placeholders: {
      name: "John Doe",
      organisation: "Support Services Inc",
      email: "coordinator@support.com.au",
      phoneNumber: "02 XXXX XXXX",
      address: "321 Care Street, Brisbane QLD 4000",
    },
  },
  alliedHealth: {
    title: "Add New Allied Health Professional",
    description: "Add a new allied health professional to your contacts",
    endpoint: "/api/allied-health-professionals",
    queryKey: "/api/allied-health-professionals",
    fields: ["name", "specialty", "practiceName", "phoneNumber", "email", "address", "notes"],
    requiredFields: ["name", "specialty"],
    labels: {
      name: "Professional Name",
      specialty: "Specialty",
      practiceName: "Practice Name",
      phoneNumber: "Phone Number",
      email: "Email",
      address: "Address",
      notes: "Notes",
    },
    placeholders: {
      name: "Dr. Sarah Johnson",
      practiceName: "Allied Health Clinic",
      phoneNumber: "02 XXXX XXXX",
      email: "professional@clinic.com.au",
      address: "555 Health Way, Sydney NSW 2000",
      notes: "Any additional notes...",
    },
    specialties: [
      "Physiotherapist",
      "Occupational Therapist",
      "Speech Pathologist",
      "Psychologist",
      "Dietitian",
      "Podiatrist",
      "Exercise Physiologist",
      "Social Worker",
      "Counsellor",
      "Behaviour Support Practitioner",
      "Other",
    ],
  },
  staff: {
    title: "Add New Staff Member",
    description: "Add a new staff member to your team",
    endpoint: "/api/staff",
    queryKey: "/api/staff",
    fields: ["name", "role", "email", "phoneNumber", "isActive"],
    requiredFields: ["name"],
    labels: {
      name: "Full Name",
      role: "Role",
      email: "Email",
      phoneNumber: "Phone Number",
      isActive: "Status",
    },
    placeholders: {
      name: "John Smith",
      email: "staff@empowerlink.au",
      phoneNumber: "04XX XXX XXX",
    },
    roles: [
      { value: "support_worker", label: "Support Worker" },
      { value: "nurse", label: "Nurse" },
      { value: "care_manager", label: "Care Manager" },
      { value: "admin", label: "Admin" },
    ],
  },
};

type FormData = Record<string, string>;

export function AddProviderDialog({ providerType, onSuccess, triggerClassName, defaultValues }: AddProviderDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const config = providerConfig[providerType];
  const prevOpenRef = useRef(false);
  
  const getInitialFormData = useCallback((): FormData => {
    return config.fields.reduce((acc, field) => {
      if (defaultValues?.[field]) acc[field] = defaultValues[field];
      else if (field === "deliveryAvailable") acc[field] = "no";
      else if (field === "isActive") acc[field] = "yes";
      else if (field === "role") acc[field] = "support_worker";
      else acc[field] = "";
      return acc;
    }, {} as FormData);
  }, [config.fields, defaultValues]);
  
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData());
  
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setFormData(getInitialFormData());
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, getInitialFormData]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", config.endpoint, data),
    onSuccess: (newProvider) => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setIsOpen(false);
      setFormData(getInitialFormData());
      toast({ title: `${config.title.replace("Add New ", "")} added successfully` });
      if (onSuccess) {
        onSuccess(newProvider);
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: `Failed to add ${config.title.replace("Add New ", "").toLowerCase()}`, 
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
    
    createMutation.mutate(formData);
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
            <SelectTrigger data-testid={`select-provider-${field}`}>
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
            <SelectTrigger data-testid={`select-provider-${field}`}>
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
            <SelectTrigger data-testid={`select-provider-${field}`}>
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
            <SelectTrigger data-testid={`select-provider-${field}`}>
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
            data-testid={`input-provider-${field}`}
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
          data-testid={`input-provider-${field}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className={triggerClassName}
          data-testid={`button-add-${providerType}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {config.fields.map(renderField)}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
