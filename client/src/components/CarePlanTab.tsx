import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Heart, FileText, Phone, Plus, Activity, Shield, History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  CarePlan, CarePlanHealthMatter, CarePlanDiagnosis, 
  CarePlanEmergencyContact
} from "@shared/schema";

const HEALTH_MATTER_TYPES = [
  "medication",
  "allergy",
  "diet",
  "mobility",
  "communication",
  "personal_care",
  "behavior",
  "medical",
  "other"
] as const;

const HEALTH_TYPE_LABELS: Record<string, string> = {
  medication: "Medication",
  allergy: "Allergy",
  diet: "Dietary",
  mobility: "Mobility",
  communication: "Communication",
  personal_care: "Personal Care",
  behavior: "Behavioral",
  medical: "Medical Condition",
  other: "Other"
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  severe: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  life_threatening: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

interface CarePlanTabProps {
  clientId: string;
  clientName: string;
  isArchived?: boolean;
}

export default function CarePlanTab({ clientId, clientName, isArchived }: CarePlanTabProps) {
  const { toast } = useToast();
  const [isAddingHealthMatter, setIsAddingHealthMatter] = useState(false);
  const [isAddingDiagnosis, setIsAddingDiagnosis] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { data: carePlans = [], isLoading: carePlansLoading } = useQuery<CarePlan[]>({
    queryKey: ["/api/clients", clientId, "care-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/care-plans`);
      if (!res.ok) throw new Error("Failed to fetch care plans");
      return res.json();
    }
  });

  const activeCarePlan = carePlans.find(cp => cp.status === "active");
  const displayCarePlan = selectedVersion 
    ? carePlans.find(cp => cp.id === selectedVersion) 
    : activeCarePlan;

  const { data: healthMatters = [] } = useQuery<CarePlanHealthMatter[]>({
    queryKey: ["/api/care-plans", displayCarePlan?.id, "health-matters"],
    queryFn: async () => {
      if (!displayCarePlan) return [];
      const res = await fetch(`/api/care-plans/${displayCarePlan.id}/health-matters`);
      if (!res.ok) throw new Error("Failed to fetch health matters");
      return res.json();
    },
    enabled: !!displayCarePlan
  });

  const { data: diagnoses = [] } = useQuery<CarePlanDiagnosis[]>({
    queryKey: ["/api/care-plans", displayCarePlan?.id, "diagnoses"],
    queryFn: async () => {
      if (!displayCarePlan) return [];
      const res = await fetch(`/api/care-plans/${displayCarePlan.id}/diagnoses`);
      if (!res.ok) throw new Error("Failed to fetch diagnoses");
      return res.json();
    },
    enabled: !!displayCarePlan
  });

  const { data: emergencyContacts = [] } = useQuery<CarePlanEmergencyContact[]>({
    queryKey: ["/api/care-plans", displayCarePlan?.id, "emergency-contacts"],
    queryFn: async () => {
      if (!displayCarePlan) return [];
      const res = await fetch(`/api/care-plans/${displayCarePlan.id}/emergency-contacts`);
      if (!res.ok) throw new Error("Failed to fetch emergency contacts");
      return res.json();
    },
    enabled: !!displayCarePlan
  });

  const createCarePlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/clients/${clientId}/care-plans`, {
        status: "draft"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "care-plans"] });
      toast({ title: "Care plan created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create care plan", description: error.message, variant: "destructive" });
    }
  });

  const activateCarePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/care-plans/${id}`, { status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "care-plans"] });
      toast({ title: "Care plan activated" });
    }
  });

  const [newHealthMatter, setNewHealthMatter] = useState({
    type: "medical" as typeof HEALTH_MATTER_TYPES[number],
    name: "",
    description: "",
    severity: "moderate" as "mild" | "moderate" | "severe" | "life_threatening",
    instructions: ""
  });

  const addHealthMatterMutation = useMutation({
    mutationFn: async (data: typeof newHealthMatter) => {
      return apiRequest("POST", `/api/care-plans/${displayCarePlan?.id}/health-matters`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-plans", displayCarePlan?.id, "health-matters"] });
      setIsAddingHealthMatter(false);
      setNewHealthMatter({
        type: "medical",
        name: "",
        description: "",
        severity: "moderate",
        instructions: ""
      });
      toast({ title: "Health matter added" });
    }
  });

  const [newDiagnosis, setNewDiagnosis] = useState({
    name: "",
    code: "",
    isPrimary: "yes" as "yes" | "no",
    severity: "moderate" as "mild" | "moderate" | "severe",
    notes: ""
  });

  const addDiagnosisMutation = useMutation({
    mutationFn: async (data: typeof newDiagnosis) => {
      return apiRequest("POST", `/api/care-plans/${displayCarePlan?.id}/diagnoses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-plans", displayCarePlan?.id, "diagnoses"] });
      setIsAddingDiagnosis(false);
      setNewDiagnosis({ name: "", code: "", isPrimary: "yes", severity: "moderate", notes: "" });
      toast({ title: "Diagnosis added" });
    }
  });

  const [newContact, setNewContact] = useState({
    name: "",
    relationship: "",
    phoneNumber: "",
    priority: "1",
    notes: ""
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: typeof newContact) => {
      return apiRequest("POST", `/api/care-plans/${displayCarePlan?.id}/emergency-contacts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-plans", displayCarePlan?.id, "emergency-contacts"] });
      setIsAddingContact(false);
      setNewContact({ name: "", relationship: "", phoneNumber: "", priority: "1", notes: "" });
      toast({ title: "Emergency contact added" });
    }
  });

  if (carePlansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading care plan...</div>
      </div>
    );
  }

  if (!displayCarePlan) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Care Plan</h3>
        <p className="text-muted-foreground mb-4">
          Create a care plan to track health matters, diagnoses, and emergency contacts for {clientName}.
        </p>
        {!isArchived && (
          <Button onClick={() => createCarePlanMutation.mutate()} disabled={createCarePlanMutation.isPending} data-testid="button-create-care-plan">
            <Plus className="w-4 h-4 mr-2" />
            Create Care Plan
          </Button>
        )}
      </Card>
    );
  }

  const isViewingHistory = selectedVersion !== null && selectedVersion !== activeCarePlan?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Care Plan
          </h2>
          <p className="text-sm text-muted-foreground">
            Version {displayCarePlan.version} - {displayCarePlan.status === "active" ? "Active" : displayCarePlan.status}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {carePlans.length > 1 && (
            <Select value={selectedVersion || activeCarePlan?.id || ""} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-[180px]" data-testid="select-care-plan-version">
                <History className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {carePlans.map(cp => (
                  <SelectItem key={cp.id} value={cp.id}>
                    v{cp.version} - {cp.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {displayCarePlan.status === "draft" && !isArchived && (
            <Button 
              onClick={() => activateCarePlanMutation.mutate(displayCarePlan.id)}
              disabled={activateCarePlanMutation.isPending}
              data-testid="button-activate-care-plan"
            >
              Activate Care Plan
            </Button>
          )}
        </div>
      </div>

      {isViewingHistory && (
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <History className="w-4 h-4" />
          <span className="text-sm">Viewing historical version. This care plan is read-only.</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedVersion(null)}>
            View Active
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Health Matters
              </CardTitle>
              {!isArchived && !isViewingHistory && displayCarePlan.status !== "archived" && (
                <Dialog open={isAddingHealthMatter} onOpenChange={setIsAddingHealthMatter}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-add-health-matter">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Health Matter</DialogTitle>
                      <DialogDescription>Record important health information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Type</Label>
                        <Select 
                          value={newHealthMatter.type} 
                          onValueChange={(v) => setNewHealthMatter({...newHealthMatter, type: v as any})}
                        >
                          <SelectTrigger data-testid="select-health-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEALTH_MATTER_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{HEALTH_TYPE_LABELS[type]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input 
                          value={newHealthMatter.name}
                          onChange={(e) => setNewHealthMatter({...newHealthMatter, name: e.target.value})}
                          placeholder="e.g., Diabetes Type 2"
                          data-testid="input-health-name"
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select 
                          value={newHealthMatter.severity} 
                          onValueChange={(v) => setNewHealthMatter({...newHealthMatter, severity: v as any})}
                        >
                          <SelectTrigger data-testid="select-severity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="severe">Severe</SelectItem>
                            <SelectItem value="life_threatening">Life Threatening</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea 
                          value={newHealthMatter.description}
                          onChange={(e) => setNewHealthMatter({...newHealthMatter, description: e.target.value})}
                          placeholder="Details about the condition..."
                          data-testid="input-health-description"
                        />
                      </div>
                      <div>
                        <Label>Management Instructions</Label>
                        <Textarea 
                          value={newHealthMatter.instructions}
                          onChange={(e) => setNewHealthMatter({...newHealthMatter, instructions: e.target.value})}
                          placeholder="How staff should manage this..."
                          data-testid="input-instructions"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingHealthMatter(false)}>Cancel</Button>
                      <Button 
                        onClick={() => addHealthMatterMutation.mutate(newHealthMatter)}
                        disabled={addHealthMatterMutation.isPending || !newHealthMatter.name}
                        data-testid="button-save-health-matter"
                      >
                        Add Health Matter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {healthMatters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No health matters recorded</p>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {healthMatters.map((matter) => (
                  <AccordionItem key={matter.id} value={matter.id} className="border rounded-lg px-3">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2 text-left">
                        <Badge className={SEVERITY_COLORS[matter.severity || "moderate"]} variant="secondary">
                          {matter.severity || "moderate"}
                        </Badge>
                        <span className="font-medium">{matter.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {HEALTH_TYPE_LABELS[matter.type] || matter.type}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3">
                      {matter.description && (
                        <p className="text-sm text-muted-foreground mb-2">{matter.description}</p>
                      )}
                      {matter.instructions && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Management Instructions</p>
                          <p className="text-sm">{matter.instructions}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Diagnoses
              </CardTitle>
              {!isArchived && !isViewingHistory && displayCarePlan.status !== "archived" && (
                <Dialog open={isAddingDiagnosis} onOpenChange={setIsAddingDiagnosis}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-add-diagnosis">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Diagnosis</DialogTitle>
                      <DialogDescription>Record clinical diagnosis with ICD-10 code</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Diagnosis Name</Label>
                        <Input 
                          value={newDiagnosis.name}
                          onChange={(e) => setNewDiagnosis({...newDiagnosis, name: e.target.value})}
                          placeholder="e.g., Major Depressive Disorder"
                          data-testid="input-diagnosis-name"
                        />
                      </div>
                      <div>
                        <Label>ICD-10 Code (optional)</Label>
                        <Input 
                          value={newDiagnosis.code}
                          onChange={(e) => setNewDiagnosis({...newDiagnosis, code: e.target.value})}
                          placeholder="e.g., F32.1"
                          data-testid="input-icd-code"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Type</Label>
                          <Select 
                            value={newDiagnosis.isPrimary} 
                            onValueChange={(v) => setNewDiagnosis({...newDiagnosis, isPrimary: v as "yes" | "no"})}
                          >
                            <SelectTrigger data-testid="select-diagnosis-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Primary</SelectItem>
                              <SelectItem value="no">Secondary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Severity</Label>
                          <Select 
                            value={newDiagnosis.severity} 
                            onValueChange={(v) => setNewDiagnosis({...newDiagnosis, severity: v as any})}
                          >
                            <SelectTrigger data-testid="select-diagnosis-severity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mild">Mild</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="severe">Severe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea 
                          value={newDiagnosis.notes}
                          onChange={(e) => setNewDiagnosis({...newDiagnosis, notes: e.target.value})}
                          placeholder="Additional clinical notes..."
                          data-testid="input-diagnosis-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingDiagnosis(false)}>Cancel</Button>
                      <Button 
                        onClick={() => addDiagnosisMutation.mutate(newDiagnosis)}
                        disabled={addDiagnosisMutation.isPending || !newDiagnosis.name}
                        data-testid="button-save-diagnosis"
                      >
                        Add Diagnosis
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No diagnoses recorded</p>
            ) : (
              <div className="space-y-3">
                {diagnoses.map((diagnosis) => (
                  <div key={diagnosis.id} className="p-3 border rounded-lg" data-testid={`diagnosis-${diagnosis.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{diagnosis.name}</span>
                          {diagnosis.code && (
                            <Badge variant="outline" className="font-mono text-xs">{diagnosis.code}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {diagnosis.isPrimary === "yes" ? "Primary" : "Secondary"}
                          </Badge>
                          <Badge className={SEVERITY_COLORS[diagnosis.severity || "moderate"]} variant="secondary">
                            {diagnosis.severity || "moderate"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {diagnosis.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{diagnosis.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              Emergency Contacts
            </CardTitle>
            {!isArchived && !isViewingHistory && displayCarePlan.status !== "archived" && (
              <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-add-emergency-contact">
                    <Plus className="w-4 h-4 mr-1" /> Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Emergency Contact</DialogTitle>
                    <DialogDescription>Add a priority emergency contact</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        placeholder="Contact name"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input 
                        value={newContact.relationship}
                        onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                        placeholder="e.g., Mother, Guardian, Partner"
                        data-testid="input-contact-relationship"
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input 
                        value={newContact.phoneNumber}
                        onChange={(e) => setNewContact({...newContact, phoneNumber: e.target.value})}
                        placeholder="Phone number"
                        data-testid="input-contact-phone"
                      />
                    </div>
                    <div>
                      <Label>Priority (1 = highest)</Label>
                      <Select 
                        value={newContact.priority} 
                        onValueChange={(v) => setNewContact({...newContact, priority: v})}
                      >
                        <SelectTrigger data-testid="select-contact-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - First to call</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={newContact.notes}
                        onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                        placeholder="Best times to call, special instructions..."
                        data-testid="input-contact-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingContact(false)}>Cancel</Button>
                    <Button 
                      onClick={() => addContactMutation.mutate(newContact)}
                      disabled={addContactMutation.isPending || !newContact.name || !newContact.phoneNumber}
                      data-testid="button-save-contact"
                    >
                      Add Contact
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {emergencyContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No emergency contacts recorded</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {emergencyContacts
                .sort((a, b) => parseInt(a.priority || "99") - parseInt(b.priority || "99"))
                .map((contact) => (
                <div key={contact.id} className="p-3 border rounded-lg" data-testid={`contact-${contact.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{contact.priority || "-"}</Badge>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Phone className="w-3 h-3" />
                    <a href={`tel:${contact.phoneNumber}`} className="hover:underline">{contact.phoneNumber}</a>
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{contact.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
