import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { insertClientSchema, type InsertClient, type ClientCategory, type SupportCoordinator, type PlanManager, type Staff, type GP, type Pharmacy, type AlliedHealthProfessional } from "@shared/schema";
import { AddProviderDialog } from "@/components/AddProviderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, Upload, X, Camera, ArrowLeft, ArrowRight, Check, Plus,
  User, Phone, Heart, Settings, Briefcase, Users, Target, FileCheck,
  MapPin, Calendar, Mail, Stethoscope, Pill, UserCog, Building2, Shield
} from "lucide-react";
import { SuburbAutocomplete } from "@/components/AddressAutocomplete";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NewClientWizardProps {
  onSubmit: (data: InsertClient, photoFile?: File | null) => Promise<void>;
  onCancel: () => void;
}

type WizardStep = {
  id: string;
  title: string;
  description: string;
  icon: typeof User;
};

const WIZARD_STEPS: WizardStep[] = [
  { id: "identity", title: "Identity", description: "Name & basic info", icon: User },
  { id: "contact", title: "Contact", description: "Phone, email & address", icon: Phone },
  { id: "clinical", title: "Clinical", description: "Medical details", icon: Heart },
  { id: "services", title: "Services", description: "Service preferences", icon: Settings },
  { id: "program", title: "Program", description: "Funding details", icon: Briefcase },
  { id: "team", title: "Care Team", description: "Assign providers", icon: Users },
  { id: "review", title: "Review", description: "Confirm details", icon: FileCheck },
];

const RELATIONSHIP_OPTIONS = [
  "Spouse", "Partner", "Parent", "Child", "Sibling", "Grandparent", "Grandchild",
  "Aunt", "Uncle", "Cousin", "Friend", "Neighbour", "Carer", "Guardian", "Other"
];

export default function NewClientWizard({ onSubmit, onCancel }: NewClientWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);
  const { toast } = useToast();
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [addGpOpen, setAddGpOpen] = useState(false);
  const [addPharmacyOpen, setAddPharmacyOpen] = useState(false);
  const [addScOpen, setAddScOpen] = useState(false);
  const [addPmOpen, setAddPmOpen] = useState(false);
  const [addAhOpen, setAddAhOpen] = useState(false);

  const { data: allStaff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: supportCoordinators = [] } = useQuery<SupportCoordinator[]>({ queryKey: ["/api/support-coordinators"] });
  const { data: planManagers = [] } = useQuery<PlanManager[]>({ queryKey: ["/api/plan-managers"] });
  const { data: gps = [] } = useQuery<GP[]>({ queryKey: ["/api/gps"] });
  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({ queryKey: ["/api/pharmacies"] });
  const { data: alliedHealthProfessionals = [] } = useQuery<AlliedHealthProfessional[]>({ queryKey: ["/api/allied-health-professionals"] });

  const careManagers = allStaff.filter(s => (s.role === "care_manager" || s.role === "admin") && s.isActive === "yes");

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      category: "NDIS",
      firstName: "",
      lastName: "",
      middleName: null,
      careTeam: {},
      clinicalDocuments: {},
      highIntensitySupports: [],
      notificationPreferences: {},
      status: "Active",
    } as any,
  });

  const [nokName, setNokName] = useState("");
  const [nokRelationship, setNokRelationship] = useState("");
  const [nokPhone, setNokPhone] = useState("");

  const [epoaName, setEpoaName] = useState("");
  const [epoaRelationship, setEpoaRelationship] = useState("");
  const [epoaPhone, setEpoaPhone] = useState("");

  const selectedCategory = form.watch("category") as ClientCategory;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Photo must be under 5MB", variant: "destructive" });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const goNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    
    if (currentStep === 1) {
      const nokValue = [nokName, nokRelationship, nokPhone].filter(Boolean).join(" - ");
      const epoaValue = [epoaName, epoaRelationship, epoaPhone].filter(Boolean).join(" - ");
      form.setValue("nokEpoa", nokValue || null);
      form.setValue("epoa", epoaValue || null);
    }
    
    if (isValid) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setDirection(-1);
      setCurrentStep(stepIndex);
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0: return ["firstName", "lastName", "category", "dateOfBirth"];
      case 1: return ["phoneNumber", "email", "streetAddress", "suburb", "state", "postcode"];
      case 2: return ["mainDiagnosis", "allergies", "advancedCareDirective"];
      case 3: return ["serviceType", "frequencyOfServices", "communicationNeeds"];
      case 4: return selectedCategory === "NDIS" 
        ? ["ndisDetails.ndisNumber", "ndisDetails.ndisFundingType"] 
        : selectedCategory === "Support at Home" 
          ? ["supportAtHomeDetails.sahNumber"] 
          : ["privateClientDetails.paymentMethod"];
      case 5: return [];
      default: return [];
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      data.participantName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");
      await onSubmit(data, photoFile);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case "identity":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 items-start">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-2 border-muted">
                    <AvatarImage src={photoPreview || undefined} alt="Client photo" />
                    <AvatarFallback className="bg-muted">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                      data-testid="button-remove-photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  data-testid="input-photo-upload"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} data-testid="button-upload-photo">
                  <Upload className="h-4 w-4 mr-2" />
                  {photoPreview ? "Change" : "Upload"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Optional</p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NDIS">NDIS</SelectItem>
                          <SelectItem value="Support at Home">Support at Home</SelectItem>
                          <SelectItem value="Private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First name" data-testid="input-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Optional" data-testid="input-middlename" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last name" data-testid="input-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" value={field.value || ""} data-testid="input-dob" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sex">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marital Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-marital-status">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Never married">Never married</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medicareNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicare Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="XXXX XXXXX X" data-testid="input-medicare" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="04XX XXX XXX" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="email" placeholder="email@example.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="streetAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="123 Main Street" data-testid="input-street-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl>
                      <SuburbAutocomplete
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        onSuburbSelect={(suburb, state, postcode) => {
                          field.onChange(suburb);
                          form.setValue("state", state);
                          form.setValue("postcode", postcode);
                        }}
                        placeholder="Start typing..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="2000" maxLength={4} data-testid="input-postcode" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Next of Kin</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Full Name</Label>
                  <Input 
                    value={nokName} 
                    onChange={(e) => setNokName(e.target.value)} 
                    placeholder="Contact name"
                    data-testid="input-nok-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Relationship</Label>
                  <Select value={nokRelationship} onValueChange={setNokRelationship}>
                    <SelectTrigger data-testid="select-nok-relationship">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Phone</Label>
                  <Input 
                    value={nokPhone} 
                    onChange={(e) => setNokPhone(e.target.value)} 
                    placeholder="04XX XXX XXX"
                    data-testid="input-nok-phone"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-purple-900 dark:text-purple-100">EPOA (Enduring Power of Attorney)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Full Name</Label>
                  <Input 
                    value={epoaName} 
                    onChange={(e) => setEpoaName(e.target.value)} 
                    placeholder="Attorney name"
                    data-testid="input-epoa-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Relationship</Label>
                  <Select value={epoaRelationship} onValueChange={setEpoaRelationship}>
                    <SelectTrigger data-testid="select-epoa-relationship">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Phone</Label>
                  <Input 
                    value={epoaPhone} 
                    onChange={(e) => setEpoaPhone(e.target.value)} 
                    placeholder="04XX XXX XXX"
                    data-testid="input-epoa-phone"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "clinical":
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="mainDiagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Diagnosis</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g., Cerebral Palsy, Multiple Sclerosis" data-testid="input-diagnosis" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} placeholder="List any known allergies..." rows={3} data-testid="input-allergies" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="advancedCareDirective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Advanced Care Directive</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-acd">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NFR">NFR (Not for Resuscitation)</SelectItem>
                      <SelectItem value="For Resus">For Resuscitation</SelectItem>
                      <SelectItem value="None">None / Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fallsRiskScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Falls Risk Score (5-20)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min={5} 
                        max={20} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="5-20" 
                        data-testid="input-falls-risk" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="substanceUseNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Substance Use Notes</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Alcohol, drugs, smoking..." data-testid="input-substance-use" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            <h4 className="text-sm font-medium mb-3">Lifestyle Patterns</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dietPatterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diet</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Dietary patterns, restrictions..." rows={2} data-testid="input-diet" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exercisePatterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Physical activity levels..." rows={2} data-testid="input-exercise" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sleepPatterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleep</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Sleep patterns, issues..." rows={2} data-testid="input-sleep" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clinicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} placeholder="Additional clinical information..." rows={3} data-testid="input-clinical-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "services":
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Support Work">Support Work</SelectItem>
                      <SelectItem value="Nursing">Nursing</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequencyOfServices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency of Services</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g., 3 times weekly" data-testid="input-frequency" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="communicationNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Communication Needs</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g., Speaks English only, uses AAC device" data-testid="input-communication" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>Notification Preferences</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="notificationPreferences.smsSchedule"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value || false} onCheckedChange={field.onChange} data-testid="checkbox-sms-schedule" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">SMS Schedule</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationPreferences.smsArrival"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value || false} onCheckedChange={field.onChange} data-testid="checkbox-sms-arrival" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">SMS Arrival</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationPreferences.callSchedule"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value || false} onCheckedChange={field.onChange} data-testid="checkbox-call-schedule" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Call Schedule</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationPreferences.callArrival"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value || false} onCheckedChange={field.onChange} data-testid="checkbox-call-arrival" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Call Arrival</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="my-4" />
            <h4 className="text-sm font-medium mb-3">Personal Preferences</h4>

            <FormField
              control={form.control}
              name="culturalBackground"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultural Background / Preferences</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="Religious, cultural, language preferences..." data-testid="input-cultural" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hobbiesInterests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hobbies & Interests</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} placeholder="Favorite food, shows, activities (list at least 4)..." rows={3} data-testid="input-hobbies" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intakeComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Comments</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} placeholder="Any other relevant intake notes..." rows={3} data-testid="input-intake-comments" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "program":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Badge variant="secondary" className="text-sm">{selectedCategory}</Badge>
              <span className="text-sm text-muted-foreground">Client</span>
            </div>

            {selectedCategory === "NDIS" && (
              <>
                <FormField
                  control={form.control}
                  name="ndisDetails.ndisNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NDIS Number</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="430XXXXXX" data-testid="input-ndis-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ndisDetails.ndisFundingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Management Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-funding-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Plan-Managed">Plan-Managed</SelectItem>
                          <SelectItem value="Agency-Managed">Agency-Managed</SelectItem>
                          <SelectItem value="Self-Managed">Self-Managed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ndisDetails.ndisPlanStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Start</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="date" data-testid="input-plan-start" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ndisDetails.ndisPlanEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan End</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="date" data-testid="input-plan-end" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {selectedCategory === "Support at Home" && (
              <>
                <FormField
                  control={form.control}
                  name="supportAtHomeDetails.sahNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support at Home Number</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="SaH Number" data-testid="input-sah-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supportAtHomeDetails.sahFundingLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sah-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Level 1">Level 1</SelectItem>
                          <SelectItem value="Level 2">Level 2</SelectItem>
                          <SelectItem value="Level 3">Level 3</SelectItem>
                          <SelectItem value="Level 4">Level 4</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {selectedCategory === "Private" && (
              <>
                <FormField
                  control={form.control}
                  name="privateClientDetails.paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="e.g., Direct Debit, Invoice" data-testid="input-payment-method" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="privateClientDetails.serviceRates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Rates</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Agreed service rates..." rows={2} data-testid="input-service-rates" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        );

      case "team":
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Assign care team members (all optional - can be added later)</p>
            
            <FormField
              control={form.control}
              name="careTeam.careManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Care Manager
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-care-manager">
                        <SelectValue placeholder="Select care manager..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {careManagers.map((cm) => (
                        <SelectItem key={cm.id} value={cm.id}>{cm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="careTeam.supportCoordinatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><UserCog className="w-4 h-4" /> Support Coordinator</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddScOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Add New
                    </Button>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-support-coordinator">
                        <SelectValue placeholder="Select coordinator..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {supportCoordinators.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>{sc.name} {sc.organisation && `(${sc.organisation})`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generalPractitionerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> General Practitioner</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddGpOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Add New
                    </Button>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-gp">
                        <SelectValue placeholder="Select GP..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {gps.map((gp) => (
                        <SelectItem key={gp.id} value={gp.id}>{gp.name} {gp.practiceName && `(${gp.practiceName})`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pharmacyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Pill className="w-4 h-4" /> Pharmacy</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddPharmacyOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Add New
                    </Button>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-pharmacy">
                        <SelectValue placeholder="Select pharmacy..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {pharmacies.map((pharmacy) => (
                        <SelectItem key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="careTeam.alliedHealthProfessionalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Allied Health Professional</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddAhOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Add New
                    </Button>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-allied-health">
                        <SelectValue placeholder="Select professional..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {alliedHealthProfessionals.map((ah) => (
                        <SelectItem key={ah.id} value={ah.id}>{ah.name} {ah.specialty && `(${ah.specialty})`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === "NDIS" && (
              <FormField
                control={form.control}
                name="careTeam.planManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Plan Manager</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddPmOpen(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Add New
                      </Button>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan-manager">
                          <SelectValue placeholder="Select plan manager..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {planManagers.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>{pm.name} {pm.organisation && `(${pm.organisation})`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );

      case "review":
        const values = form.getValues();
        const careManager = careManagers.find(cm => cm.id === values.careTeam?.careManagerId);
        const supportCoordinator = supportCoordinators.find(sc => sc.id === values.careTeam?.supportCoordinatorId);
        const gp = gps.find(g => g.id === values.generalPractitionerId);
        const pharmacy = pharmacies.find(p => p.id === values.pharmacyId);
        const planManager = planManagers.find(pm => pm.id === values.careTeam?.planManagerId);
        const alliedHealth = alliedHealthProfessionals.find(ah => ah.id === values.careTeam?.alliedHealthProfessionalId);

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {values.firstName?.charAt(0)}{values.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{values.firstName} {values.middleName} {values.lastName}</h3>
                <Badge>{values.category}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2"><User className="w-4 h-4" /> Identity</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><Calendar className="w-3 h-3 inline mr-1" /> {values.dateOfBirth || "DOB not set"}</p>
                  <p><Phone className="w-3 h-3 inline mr-1" /> {values.phoneNumber || "No phone"}</p>
                  <p><Mail className="w-3 h-3 inline mr-1" /> {values.email || "No email"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</h4>
                <p className="text-muted-foreground">
                  {values.streetAddress && `${values.streetAddress}, `}
                  {values.suburb && `${values.suburb} `}
                  {values.state} {values.postcode}
                  {!values.streetAddress && !values.suburb && "Not provided"}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2"><Heart className="w-4 h-4" /> Clinical</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p>Diagnosis: {values.mainDiagnosis || "Not set"}</p>
                  <p>Allergies: {values.allergies || "None listed"}</p>
                  <p>ACD: {values.advancedCareDirective || "Not set"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4" /> Care Team</h4>
                <div className="space-y-1 text-muted-foreground">
                  {careManager && <p>Care Manager: {careManager.name}</p>}
                  {supportCoordinator && <p>Coordinator: {supportCoordinator.name}</p>}
                  {gp && <p>GP: {gp.name}</p>}
                  {pharmacy && <p>Pharmacy: {pharmacy.name}</p>}
                  {planManager && <p>Plan Manager: {planManager.name}</p>}
                  {alliedHealth && <p>Allied Health: {alliedHealth.name}</p>}
                  {!careManager && !supportCoordinator && !gp && !pharmacy && !planManager && !alliedHealth && <p>None assigned yet</p>}
                </div>
              </div>
            </div>

            {nokName && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Next of Kin</h4>
                <p className="text-sm text-muted-foreground">
                  {nokName} {nokRelationship && `(${nokRelationship})`} {nokPhone && `- ${nokPhone}`}
                </p>
              </div>
            )}

            {epoaName && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> EPOA</h4>
                <p className="text-sm text-muted-foreground">
                  {epoaName} {epoaRelationship && `(${epoaRelationship})`} {epoaPhone && `- ${epoaPhone}`}
                </p>
              </div>
            )}

            {selectedCategory === "NDIS" && values.ndisDetails?.ndisNumber && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-sm">NDIS Details</h4>
                <p className="text-sm text-muted-foreground">
                  Number: {values.ndisDetails.ndisNumber} | 
                  Funding: {values.ndisDetails.ndisFundingType || "Not set"}
                </p>
              </div>
            )}

            {selectedCategory === "Support at Home" && values.supportAtHomeDetails?.sahNumber && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="font-medium text-sm">Support at Home Details</h4>
                <p className="text-sm text-muted-foreground">
                  Number: {values.supportAtHomeDetails.sahNumber} | 
                  Level: {values.supportAtHomeDetails.sahFundingLevel || "Not set"}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Form {...form}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                    isCurrent && "bg-primary text-primary-foreground",
                    isComplete && "bg-primary/10 text-primary cursor-pointer",
                    !isCurrent && !isComplete && "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  data-testid={`step-${step.id}`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              );
            })}
          </div>

          <Card className="min-h-[400px]">
            <CardHeader>
              <div className="flex items-center gap-3">
                {(() => {
                  const StepIcon = WIZARD_STEPS[currentStep].icon;
                  return <StepIcon className="w-6 h-6 text-primary" />;
                })()}
                <div>
                  <CardTitle>{WIZARD_STEPS[currentStep].title}</CardTitle>
                  <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : goBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 0 ? "Cancel" : "Back"}
            </Button>

            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-create-client"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Client
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} data-testid="button-next">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Form>

      <AddProviderDialog
        providerType="gp"
        open={addGpOpen}
        onOpenChange={setAddGpOpen}
        showTrigger={false}
        onSuccess={(newGp) => {
          form.setValue("generalPractitionerId", newGp.id);
        }}
      />
      <AddProviderDialog
        providerType="pharmacy"
        open={addPharmacyOpen}
        onOpenChange={setAddPharmacyOpen}
        showTrigger={false}
        onSuccess={(newPharmacy) => {
          form.setValue("pharmacyId", newPharmacy.id);
        }}
      />
      <AddProviderDialog
        providerType="supportCoordinator"
        open={addScOpen}
        onOpenChange={setAddScOpen}
        showTrigger={false}
        onSuccess={(newSc) => {
          form.setValue("careTeam.supportCoordinatorId", newSc.id);
        }}
      />
      <AddProviderDialog
        providerType="planManager"
        open={addPmOpen}
        onOpenChange={setAddPmOpen}
        showTrigger={false}
        onSuccess={(newPm) => {
          form.setValue("careTeam.planManagerId", newPm.id);
        }}
      />
      <AddProviderDialog
        providerType="alliedHealth"
        open={addAhOpen}
        onOpenChange={setAddAhOpen}
        showTrigger={false}
        onSuccess={(newAh) => {
          form.setValue("careTeam.alliedHealthProfessionalId", newAh.id);
        }}
      />
    </>
  );
}
