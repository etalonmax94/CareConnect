import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Save, FileText, Pen, Calendar, Mail, Phone, MapPin, 
  Camera, Star, Check, X, ChevronLeft, ChevronRight, Upload, 
  Eraser, Download, AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  FormTemplate, FormTemplateField, FormSubmission, FormSubmissionValue, FormSignature, Client 
} from "@shared/schema";

interface FormFillerProps {
  templateId: string;
  clientId: string;
  submissionId?: string;
  onComplete?: (submission: FormSubmission) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  linkedDocumentType?: string;
}

type FieldValue = string | boolean | string[] | number | null;

export default function FormFiller({ 
  templateId, 
  clientId, 
  submissionId, 
  onComplete, 
  onCancel,
  readOnly = false,
  linkedDocumentType
}: FormFillerProps) {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, FieldValue>>({});
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: template, isLoading: templateLoading } = useQuery<FormTemplate>({
    queryKey: ["/api/form-templates", templateId],
    enabled: !!templateId,
  });

  const { data: fields = [], isLoading: fieldsLoading } = useQuery<FormTemplateField[]>({
    queryKey: ["/api/form-templates", templateId, "fields"],
    enabled: !!templateId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: existingSubmission } = useQuery<FormSubmission>({
    queryKey: ["/api/form-submissions", submissionId],
    enabled: !!submissionId,
  });

  const { data: existingValues = [] } = useQuery<FormSubmissionValue[]>({
    queryKey: ["/api/form-submissions", submissionId, "values"],
    enabled: !!submissionId,
  });

  const { data: existingSignatures = [] } = useQuery<FormSignature[]>({
    queryKey: ["/api/form-submissions", submissionId, "signatures"],
    enabled: !!submissionId,
  });

  useEffect(() => {
    if (existingValues.length > 0 && fields.length > 0) {
      const values: Record<string, FieldValue> = {};
      existingValues.forEach(v => {
        const field = fields.find(f => f.id === v.fieldId);
        if (!field) return;
        
        const rawValue = v.value as unknown;
        if (typeof rawValue === "boolean") {
          values[field.fieldKey] = rawValue;
        } else if (Array.isArray(rawValue)) {
          values[field.fieldKey] = rawValue as string[];
        } else if (typeof rawValue === "number") {
          values[field.fieldKey] = rawValue;
        } else if (typeof rawValue === "string") {
          values[field.fieldKey] = rawValue;
        } else {
          values[field.fieldKey] = rawValue as FieldValue;
        }
      });
      setFormValues(values);
    }
  }, [existingValues, fields]);

  useEffect(() => {
    if (existingSignatures.length > 0) {
      const sigs: Record<string, string> = {};
      existingSignatures.forEach(s => {
        if (s.signatureData && s.signerRole) {
          sigs[s.signerRole] = s.signatureData;
        }
      });
      setSignatureData(sigs);
    }
  }, [existingSignatures]);

  useEffect(() => {
    if (client && fields.length > 0) {
      const prefilled: Record<string, FieldValue> = { ...formValues };
      fields.forEach(field => {
        if (formValues[field.fieldKey] !== undefined) return;
        
        if (field.fieldKey === "participant_name" && client.participantName) {
          prefilled[field.fieldKey] = client.participantName;
        } else if (field.fieldKey === "date_of_birth" && client.dateOfBirth) {
          prefilled[field.fieldKey] = client.dateOfBirth;
        } else if (field.fieldKey === "address" && client.homeAddress) {
          prefilled[field.fieldKey] = client.homeAddress;
        } else if (field.fieldKey === "phone" && client.phoneNumber) {
          prefilled[field.fieldKey] = client.phoneNumber;
        } else if (field.fieldKey === "email" && client.email) {
          prefilled[field.fieldKey] = client.email;
        } else if (field.fieldKey === "is_ndis_participant") {
          prefilled[field.fieldKey] = client.category === "NDIS" ? "yes" : "no";
        } else if (field.fieldKey === "ndis_number" && client.ndisDetails) {
          prefilled[field.fieldKey] = (client.ndisDetails as any)?.ndisNumber || "";
        } else if (field.fieldKey === "ndis_plan_start" && client.ndisDetails) {
          prefilled[field.fieldKey] = (client.ndisDetails as any)?.ndisPlanStartDate || "";
        } else if (field.fieldKey === "ndis_plan_end" && client.ndisDetails) {
          prefilled[field.fieldKey] = (client.ndisDetails as any)?.ndisPlanEndDate || "";
        } else if (field.fieldKey === "signature_date") {
          prefilled[field.fieldKey] = new Date().toISOString().split('T')[0];
        }
      });
      if (Object.keys(prefilled).length !== Object.keys(formValues).length) {
        setFormValues(prefilled);
      }
    }
  }, [client, fields]);

  const sortedFields = [...fields].sort((a, b) => 
    parseInt(a.order || "0") - parseInt(b.order || "0")
  );

  const sections = Array.from(new Set(sortedFields.filter(f => f.section).map(f => f.section!)));

  const getFieldsForSection = (section: string | null) => {
    return sortedFields.filter(f => f.section === section);
  };

  const isFieldVisible = (field: FormTemplateField): boolean => {
    if (!field.conditionalOn) return true;
    const conditionValue = formValues[field.conditionalOn];
    const targetValue = field.conditionalValue;
    const operator = field.conditionalOperator || "equals";

    switch (operator) {
      case "equals":
        return conditionValue === targetValue || String(conditionValue) === targetValue;
      case "not_equals":
        return conditionValue !== targetValue && String(conditionValue) !== targetValue;
      case "contains":
        return String(conditionValue || "").includes(targetValue || "");
      case "greater_than":
        return Number(conditionValue) > Number(targetValue);
      case "less_than":
        return Number(conditionValue) < Number(targetValue);
      default:
        return true;
    }
  };

  const validateField = (field: FormTemplateField, value: FieldValue): string | null => {
    if (field.isRequired === "yes" && !isFieldVisible(field)) return null;
    
    if (field.isRequired === "yes") {
      if (value === null || value === undefined || value === "" || 
          (Array.isArray(value) && value.length === 0)) {
        return `${field.label} is required`;
      }
    }

    if (value && typeof value === "string") {
      if (field.minLength && value.length < parseInt(field.minLength)) {
        return `${field.label} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength && value.length > parseInt(field.maxLength)) {
        return `${field.label} must be no more than ${field.maxLength} characters`;
      }
      if (field.pattern) {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            return `${field.label} format is invalid`;
          }
        } catch {
          // Invalid regex, skip validation
        }
      }
    }

    if (field.fieldType === "email" && value && typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
      }
    }

    if (field.fieldType === "number" && value !== null && value !== undefined && value !== "") {
      const numValue = typeof value === "number" ? value : parseFloat(value as string);
      if (isNaN(numValue)) {
        return "Please enter a valid number";
      }
      if (field.minValue && numValue < parseFloat(field.minValue)) {
        return `${field.label} must be at least ${field.minValue}`;
      }
      if (field.maxValue && numValue > parseFloat(field.maxValue)) {
        return `${field.label} must be no more than ${field.maxValue}`;
      }
    }

    return null;
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    sortedFields.forEach(field => {
      if (!isFieldVisible(field)) return;
      
      const value = formValues[field.fieldKey];
      const error = validateField(field, value);
      if (error) {
        errors[field.fieldKey] = error;
        isValid = false;
      }

      if (field.fieldType === "signature" && field.isRequired === "yes") {
        if (!signatureData[field.fieldKey]) {
          errors[field.fieldKey] = `${field.label} is required`;
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleFieldChange = (fieldKey: string, value: FieldValue) => {
    setFormValues(prev => ({ ...prev, [fieldKey]: value }));
    if (validationErrors[fieldKey]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const openSignaturePad = (fieldKey: string) => {
    setCurrentSignatureField(fieldKey);
    setSignaturePadOpen(true);
  };

  const initializeCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentSignatureField && signatureData[currentSignatureField]) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = signatureData[currentSignatureField];
    }
  }, [currentSignatureField, signatureData]);

  useEffect(() => {
    if (signaturePadOpen) {
      setTimeout(initializeCanvas, 100);
    }
  }, [signaturePadOpen, initializeCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    if (!currentSignatureField) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(prev => ({ ...prev, [currentSignatureField]: dataUrl }));
    setSignaturePadOpen(false);
    setCurrentSignatureField(null);
    
    if (validationErrors[currentSignatureField]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[currentSignatureField!];
        return next;
      });
    }
  };

  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      const submission = await apiRequest("POST", `/api/form-submissions`, {
        templateId,
        clientId,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        validityPeriod: template?.category === "consent" ? "annual" : "as-needed",
        linkedDocumentType,
      });
      
      const submissionData = await submission.json();
      
      for (const field of fields) {
        const value = formValues[field.fieldKey];
        if (value === null || value === undefined) continue;
        
        await apiRequest("POST", `/api/form-submissions/${submissionData.id}/values`, {
          fieldId: field.id,
          value: value,
        });
      }

      for (const [fieldKey, sigData] of Object.entries(signatureData)) {
        const sigField = fields.find(f => f.fieldKey === fieldKey);
        await apiRequest("POST", `/api/form-submissions/${submissionData.id}/signatures`, {
          signerName: client?.participantName || "Participant",
          signerRole: fieldKey,
          signatureData: sigData,
          signedAt: new Date().toISOString(),
        });
      }

      return submissionData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      toast({ title: "Form submitted successfully" });
      onComplete?.(data);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit form", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = async () => {
    if (!validateAllFields()) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields correctly", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createSubmissionMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormTemplateField) => {
    if (!isFieldVisible(field)) return null;

    const value = formValues[field.fieldKey];
    const error = validationErrors[field.fieldKey];
    const fieldWidthClass = field.width === "half" ? "md:w-[calc(50%-0.5rem)]" : 
                           field.width === "third" ? "md:w-[calc(33.333%-0.5rem)]" : "w-full";

    const renderFieldContent = () => {
      switch (field.fieldType) {
        case "section_header":
          return (
            <div className="pt-4 pb-2">
              <h3 className="text-lg font-semibold text-foreground">{field.label}</h3>
              {field.description && (
                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
              )}
              <Separator className="mt-2" />
            </div>
          );

        case "paragraph":
          return (
            <div className="py-2 px-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              {field.label}
            </div>
          );

        case "text":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <Input
                id={field.fieldKey}
                value={(value as string) || ""}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                placeholder={field.placeholder || ""}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`input-${field.fieldKey}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "textarea":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <Textarea
                id={field.fieldKey}
                value={(value as string) || ""}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                placeholder={field.placeholder || ""}
                disabled={readOnly}
                className={`min-h-[80px] ${error ? "border-red-500" : ""}`}
                data-testid={`textarea-${field.fieldKey}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "email":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id={field.fieldKey}
                  type="email"
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder || "email@example.com"}
                  disabled={readOnly}
                  className={`pl-10 ${error ? "border-red-500" : ""}`}
                  data-testid={`input-${field.fieldKey}`}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "number":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              <Input
                id={field.fieldKey}
                type="number"
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={field.placeholder || ""}
                min={field.minValue || undefined}
                max={field.maxValue || undefined}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`input-${field.fieldKey}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "date":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id={field.fieldKey}
                  type="date"
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                  disabled={readOnly}
                  className={`pl-10 ${error ? "border-red-500" : ""}`}
                  data-testid={`input-${field.fieldKey}`}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "time":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              <Input
                id={field.fieldKey}
                type="time"
                value={(value as string) || ""}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`input-${field.fieldKey}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "datetime":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              <Input
                id={field.fieldKey}
                type="datetime-local"
                value={(value as string) || ""}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`input-${field.fieldKey}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "yes_no":
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={value === "yes" ? "default" : "outline"}
                  onClick={() => !readOnly && handleFieldChange(field.fieldKey, "yes")}
                  disabled={readOnly}
                  className="flex-1 gap-2"
                  data-testid={`button-${field.fieldKey}-yes`}
                >
                  <Check className="w-4 h-4" />
                  {field.yesLabel || "Yes"}
                </Button>
                <Button
                  type="button"
                  variant={value === "no" ? "default" : "outline"}
                  onClick={() => !readOnly && handleFieldChange(field.fieldKey, "no")}
                  disabled={readOnly}
                  className="flex-1 gap-2"
                  data-testid={`button-${field.fieldKey}-no`}
                >
                  <X className="w-4 h-4" />
                  {field.noLabel || "No"}
                </Button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "checkbox":
          return (
            <div className="flex items-start space-x-3 py-2">
              <Checkbox
                id={field.fieldKey}
                checked={value === true || value === "true"}
                onCheckedChange={(checked) => handleFieldChange(field.fieldKey, checked)}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`checkbox-${field.fieldKey}`}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor={field.fieldKey} 
                  className={`cursor-pointer ${field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}`}
                >
                  {field.label}
                </Label>
                {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            </div>
          );

        case "radio":
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <RadioGroup
                value={(value as string) || ""}
                onValueChange={(v) => handleFieldChange(field.fieldKey, v)}
                disabled={readOnly}
                className={error ? "border border-red-500 rounded-lg p-2" : ""}
              >
                {field.options?.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`${field.fieldKey}-${opt.value}`} data-testid={`radio-${field.fieldKey}-${opt.value}`} />
                    <Label htmlFor={`${field.fieldKey}-${opt.value}`} className="cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "select":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <Select
                value={(value as string) || ""}
                onValueChange={(v) => handleFieldChange(field.fieldKey, v)}
                disabled={readOnly}
              >
                <SelectTrigger className={error ? "border-red-500" : ""} data-testid={`select-${field.fieldKey}`}>
                  <SelectValue placeholder={field.placeholder || "Select an option"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "multiselect":
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <div className="space-y-2 border rounded-lg p-3">
                {field.options?.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.fieldKey}-${opt.value}`}
                      checked={selectedValues.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleFieldChange(field.fieldKey, [...selectedValues, opt.value]);
                        } else {
                          handleFieldChange(field.fieldKey, selectedValues.filter(v => v !== opt.value));
                        }
                      }}
                      disabled={readOnly}
                      data-testid={`multiselect-${field.fieldKey}-${opt.value}`}
                    />
                    <Label htmlFor={`${field.fieldKey}-${opt.value}`} className="cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "rating":
          const maxRating = parseInt(field.ratingMax || "5");
          const ratingStyle = field.ratingStyle || "stars";
          const currentRating = typeof value === "number" ? value : parseInt(value as string) || 0;
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <div className="flex gap-2">
                {Array.from({ length: maxRating }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => !readOnly && handleFieldChange(field.fieldKey, n)}
                    disabled={readOnly}
                    className="p-1"
                    data-testid={`rating-${field.fieldKey}-${n}`}
                  >
                    {ratingStyle === "stars" && (
                      <Star className={`w-6 h-6 ${n <= currentRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    )}
                    {ratingStyle === "numbers" && (
                      <span className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center ${n <= currentRating ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {n}
                      </span>
                    )}
                    {ratingStyle === "emoji" && (
                      <span className={`text-2xl ${n <= currentRating ? "" : "opacity-30"}`}>
                        {n === 1 ? "😢" : n === 2 ? "😕" : n === 3 ? "😐" : n === 4 ? "🙂" : "😄"}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "slider":
          const sliderMin = parseFloat(field.sliderMin || "0");
          const sliderMax = parseFloat(field.sliderMax || "100");
          const sliderStep = parseFloat(field.sliderStep || "1");
          const sliderValue = typeof value === "number" ? value : parseFloat(value as string) || sliderMin;
          return (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                  {field.label}
                </Label>
                <span className="text-sm font-medium">
                  {sliderValue}{field.sliderUnit || ""}
                </span>
              </div>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <Slider
                value={[sliderValue]}
                onValueChange={([v]) => handleFieldChange(field.fieldKey, v)}
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                disabled={readOnly}
                className={error ? "border-red-500" : ""}
                data-testid={`slider-${field.fieldKey}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{sliderMin}{field.sliderUnit || ""}</span>
                <span>{sliderMax}{field.sliderUnit || ""}</span>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "signature":
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              {signatureData[field.fieldKey] ? (
                <div className="border rounded-lg p-2 bg-white">
                  <img 
                    src={signatureData[field.fieldKey]} 
                    alt="Signature" 
                    className="max-h-24 mx-auto"
                  />
                  {!readOnly && (
                    <div className="flex justify-center gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openSignaturePad(field.fieldKey)}
                        data-testid={`button-edit-signature-${field.fieldKey}`}
                      >
                        <Pen className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSignatureData(prev => {
                          const next = { ...prev };
                          delete next[field.fieldKey];
                          return next;
                        })}
                        data-testid={`button-clear-signature-${field.fieldKey}`}
                      >
                        <Eraser className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openSignaturePad(field.fieldKey)}
                  disabled={readOnly}
                  className={`w-full h-24 border-dashed ${error ? "border-red-500" : ""}`}
                  data-testid={`button-add-signature-${field.fieldKey}`}
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Pen className="w-6 h-6" />
                    <span>Click to sign</span>
                  </div>
                </Button>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "file":
        case "image_upload":
        case "video_upload":
        case "audio":
          return (
            <div className="space-y-2">
              <Label className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${error ? "border-red-500" : "border-muted-foreground/25"}`}>
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  {field.fieldType === "image_upload" ? "Upload an image" :
                   field.fieldType === "video_upload" ? "Upload a video" :
                   field.fieldType === "audio" ? "Upload an audio file" :
                   "Upload a file"}
                </p>
                {field.acceptedFileTypes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted: {field.acceptedFileTypes}
                  </p>
                )}
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled={readOnly}>
                  Choose File
                </Button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        case "location":
          return (
            <div className="space-y-1">
              <Label htmlFor={field.fieldKey} className={field.isRequired === "yes" ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                {field.label}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id={field.fieldKey}
                  value={(value as string) || ""}
                  onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder || "Enter location"}
                  disabled={readOnly}
                  className={`pl-10 ${error ? "border-red-500" : ""}`}
                  data-testid={`input-${field.fieldKey}`}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-1" disabled={readOnly}>
                <MapPin className="w-4 h-4 mr-1" />
                Use Current Location
              </Button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          );

        default:
          return (
            <div className="space-y-1">
              <Label>{field.label}</Label>
              <p className="text-xs text-muted-foreground">
                Field type "{field.fieldType}" is not yet supported
              </p>
            </div>
          );
      }
    };

    return (
      <div key={field.id} className={`${fieldWidthClass} ${field.fieldType === "section_header" ? "" : ""}`}>
        {renderFieldContent()}
      </div>
    );
  };

  if (templateLoading || fieldsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <p className="mt-2 text-muted-foreground">Form template not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              v{template.version}
            </Badge>
          </div>
          {client && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              For: <span className="font-medium text-foreground">{client.participantName}</span>
            </div>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {sortedFields.filter(f => isFieldVisible(f)).map(field => renderField(field))}
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end gap-3 sticky bottom-0 bg-background pt-4 pb-2 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
            data-testid="button-submit-form"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            Submit Form
          </Button>
        </div>
      )}

      <Dialog open={signaturePadOpen} onOpenChange={setSignaturePadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Draw Your Signature</DialogTitle>
            <DialogDescription>
              Use your mouse or finger to sign below
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={clearSignature}>
              <Eraser className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button type="button" onClick={saveSignature} data-testid="button-save-signature">
              <Check className="w-4 h-4 mr-1" />
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
