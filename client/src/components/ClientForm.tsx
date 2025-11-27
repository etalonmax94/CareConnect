import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client, type ClientCategory, type SupportCoordinator, type PlanManager, type Staff, type GP, type Pharmacy, type AlliedHealthProfessional } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Camera } from "lucide-react";
import { SuburbAutocomplete } from "@/components/AddressAutocomplete";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { AddProviderDialog } from "@/components/AddProviderDialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: InsertClient, photoFile?: File | null) => Promise<void>;
  onCancel: () => void;
}

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory>(client?.category || "NDIS");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Fetch staff, support coordinators, and plan managers for dropdowns
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: supportCoordinators = [] } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  const { data: planManagers = [] } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  const { data: gps = [] } = useQuery<GP[]>({
    queryKey: ["/api/gps"],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ["/api/pharmacies"],
  });

  const { data: alliedHealthProfessionals = [] } = useQuery<AlliedHealthProfessional[]>({
    queryKey: ["/api/allied-health-professionals"],
  });

  // Filter staff by role for care managers
  const careManagers = allStaff.filter(s => s.role === "care_manager" && s.isActive === "yes");

  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(client?.photo || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);

  // Fetch diagnoses for autocomplete
  const { data: diagnoses = [] } = useQuery<string[]>({
    queryKey: ["/api/diagnoses", diagnosisSearch],
    enabled: diagnosisOpen,
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: client ? {
      ...client,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      middleName: client.middleName || null,
    } : {
      category: "NDIS",
      firstName: "",
      lastName: "",
      middleName: null,
      careTeam: {},
      clinicalDocuments: {},
      highIntensitySupports: [],
      notificationPreferences: {},
    } as any,
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Photo must be under 5MB", variant: "destructive" });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const isDirty = form.formState.isDirty;
  const { showWarning, confirmNavigation, handleConfirm, handleCancel } = useUnsavedChanges({
    hasChanges: isDirty && !formSubmitted,
  });

  const handleCancelWithWarning = () => {
    confirmNavigation(onCancel);
  };

  const handleSubmit = async (data: InsertClient) => {
    setIsSubmitting(true);
    setFormSubmitted(true);
    try {
      await onSubmit(data, photoFile);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFormError = (errors: any) => {
    console.error("Form validation errors:", errors);
  };

  const formErrors = form.formState.errors;
  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, onFormError)} className="space-y-4 sm:space-y-6">
        {hasErrors && (
          <div className="bg-destructive/10 border border-destructive rounded-md p-4 mb-4">
            <p className="text-destructive font-medium text-sm">Please fix the following errors:</p>
            <ul className="list-disc list-inside text-destructive text-sm mt-2">
              {formErrors.firstName && <li>First Name is required</li>}
              {formErrors.lastName && <li>Last Name is required</li>}
              {formErrors.category && <li>Client Category is required</li>}
              {Object.entries(formErrors).filter(([key]) => !['firstName', 'lastName', 'category'].includes(key)).map(([key, error]) => (
                <li key={key}>{key}: {(error as any)?.message || 'Invalid value'}</li>
              ))}
            </ul>
          </div>
        )}
        <Tabs defaultValue="basic" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:grid sm:w-full sm:grid-cols-5">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
              <TabsTrigger value="program" className="text-xs sm:text-sm">Program</TabsTrigger>
              <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
              <TabsTrigger value="clinical" className="text-xs sm:text-sm">Clinical</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">Docs</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Upload Section */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={photoPreview || undefined} alt="Client photo" />
                      <AvatarFallback className="bg-muted">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover-elevate"
                        data-testid="button-remove-photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Client Photo</Label>
                    <p className="text-xs text-muted-foreground mb-2">Upload a photo (max 5MB)</p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      data-testid="input-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      data-testid="button-upload-photo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {photoPreview ? "Change Photo" : "Upload Photo"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Category *</FormLabel>
                      <Select onValueChange={(value) => { field.onChange(value); setSelectedCategory(value as ClientCategory); }} value={field.value}>
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
                        <Input {...field} value={field.value || ""} placeholder="Middle name (optional)" data-testid="input-middlename" />
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

                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="123 Main Street" data-testid="input-street-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb/City</FormLabel>
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
                          placeholder="Start typing suburb..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
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

                <FormField
                  control={form.control}
                  name="nokEpoa"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Next of Kin / EPOA</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Name - Contact" data-testid="input-nok" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-red-600 dark:text-red-400 font-bold">Allergies</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="List any known allergies..."
                          className="border-red-200 dark:border-red-800 focus:border-red-400"
                          data-testid="input-allergies"
                        />
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
                        <Input {...field} value={field.value || ""} data-testid="input-communication" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 space-y-4">
                  <Label>Notification Preferences</Label>
                  <p className="text-sm text-muted-foreground">How would the client like to be notified?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="notificationPreferences.smsSchedule"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sms-schedule"
                            />
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
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sms-arrival"
                            />
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
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-call-schedule"
                            />
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
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-call-arrival"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Call Arrival</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notificationPreferences.none"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-no-notifications"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">N/A (No notifications)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-6 mt-6">
            {/* Frequency of Services - applies to all client types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Frequency</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {selectedCategory === "NDIS" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NDIS Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <SelectValue placeholder="Select funding management type" />
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

                  <FormField
                    control={form.control}
                    name="ndisDetails.ndisPlanStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Start Date</FormLabel>
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
                        <FormLabel>Plan End Date</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="date" data-testid="input-plan-end" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ndisDetails.scheduleOfSupports"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Schedule of Supports / Budget</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., $45,000 annually" data-testid="input-budget" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {selectedCategory === "Support at Home" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Support at Home Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supportAtHomeDetails.sahNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SaH Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-sah-number" />
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
                        <FormLabel>SaH Funding Level</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Level 1-4" data-testid="input-sah-level" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supportAtHomeDetails.scheduleOfSupports"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Schedule of Supports</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-hcp-supports" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {selectedCategory === "Private" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Private Client Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="privateClientDetails.paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-payment-method" />
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
                          <Input {...field} value={field.value || ""} placeholder="e.g., $85/hour" data-testid="input-rates" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="privateClientDetails.billingPreferences"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Billing Preferences</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-billing" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Care Team</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="careTeam.careManager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Manager</FormLabel>
                      <div className="flex gap-1">
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-care-manager">
                              <SelectValue placeholder="Select care manager..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {careManagers.map((staff) => (
                              <SelectItem key={staff.id} value={staff.name}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddProviderDialog 
                          providerType="staff" 
                          defaultValues={{ role: "care_manager" }}
                          onSuccess={(newStaff) => {
                            queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
                            field.onChange(newStaff.name);
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={form.control}
                  name="careTeam.generalPractitioner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Practitioner</FormLabel>
                      <div className="flex gap-1">
                        <Select 
                          onValueChange={(value) => {
                            if (value === "none") {
                              field.onChange("");
                            } else {
                              const selectedGP = gps.find(g => g.id === value);
                              if (selectedGP) {
                                const displayName = `${selectedGP.name}${selectedGP.practiceName ? ` - ${selectedGP.practiceName}` : ''}`;
                                field.onChange(displayName);
                              }
                            }
                          }}
                          value={gps.find(g => 
                            field.value?.includes(g.name) || 
                            (g.practiceName && field.value?.includes(g.practiceName))
                          )?.id || (field.value ? "custom" : "")}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-gp">
                              <SelectValue placeholder="Select GP...">
                                {field.value || "Select GP..."}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {gps.map((gp) => (
                              <SelectItem key={gp.id} value={gp.id}>
                                {gp.name}{gp.practiceName ? ` - ${gp.practiceName}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddProviderDialog 
                          providerType="gp" 
                          onSuccess={(newGP) => {
                            queryClient.invalidateQueries({ queryKey: ["/api/gps"] });
                            const displayName = `${newGP.name}${newGP.practiceName ? ` - ${newGP.practiceName}` : ''}`;
                            field.onChange(displayName);
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.supportCoordinatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Coordinator</FormLabel>
                      <div className="flex gap-1">
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? undefined : value);
                            const sc = supportCoordinators.find(s => s.id === value);
                            form.setValue("careTeam.supportCoordinator", sc ? `${sc.name}${sc.organisation ? ` (${sc.organisation})` : ''}` : '');
                          }} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-coordinator">
                              <SelectValue placeholder="Select support coordinator..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {supportCoordinators.map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>
                                {sc.name}{sc.organisation ? ` (${sc.organisation})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddProviderDialog 
                          providerType="supportCoordinator" 
                          onSuccess={(newSC) => {
                            queryClient.invalidateQueries({ queryKey: ["/api/support-coordinators"] });
                            field.onChange(newSC.id);
                            form.setValue("careTeam.supportCoordinator", `${newSC.name}${newSC.organisation ? ` (${newSC.organisation})` : ''}`);
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.planManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Manager</FormLabel>
                      <div className="flex gap-1">
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? undefined : value);
                            const pm = planManagers.find(p => p.id === value);
                            form.setValue("careTeam.planManager", pm ? `${pm.name}${pm.organisation ? ` (${pm.organisation})` : ''}` : '');
                          }} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-plan-manager">
                              <SelectValue placeholder="Select plan manager..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {planManagers.map((pm) => (
                              <SelectItem key={pm.id} value={pm.id}>
                                {pm.name}{pm.organisation ? ` (${pm.organisation})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddProviderDialog 
                          providerType="planManager" 
                          onSuccess={(newPM) => {
                            queryClient.invalidateQueries({ queryKey: ["/api/plan-managers"] });
                            field.onChange(newPM.id);
                            form.setValue("careTeam.planManager", `${newPM.name}${newPM.organisation ? ` (${newPM.organisation})` : ''}`);
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.alliedHealthProfessionalId"
                  render={({ field }) => {
                    const selectedAhp = alliedHealthProfessionals.find(a => a.id === field.value);
                    return (
                      <FormItem>
                        <FormLabel>Allied Health Professional</FormLabel>
                        <div className="flex gap-1">
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value === "none" ? undefined : value);
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-allied-health">
                                <SelectValue placeholder="Select allied health professional...">
                                  {selectedAhp ? `${selectedAhp.name} (${selectedAhp.specialty})` : "Select allied health professional..."}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {alliedHealthProfessionals.map((ahp) => (
                                <SelectItem key={ahp.id} value={ahp.id}>
                                  {ahp.name} ({ahp.specialty})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddProviderDialog 
                            providerType="alliedHealth" 
                            onSuccess={(newAHP) => {
                              queryClient.invalidateQueries({ queryKey: ["/api/allied-health-professionals"] });
                              field.onChange(newAHP.id);
                            }}
                          />
                        </div>
                        {selectedAhp && (
                          <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                            {selectedAhp.practiceName && <p>Practice: {selectedAhp.practiceName}</p>}
                            {selectedAhp.phoneNumber && <p>Phone: {selectedAhp.phoneNumber}</p>}
                            {selectedAhp.email && <p>Email: {selectedAhp.email}</p>}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="pharmacyId"
                  render={({ field }) => {
                    const selectedPharmacy = pharmacies.find(p => p.id === field.value);
                    return (
                      <FormItem>
                        <FormLabel>Pharmacy</FormLabel>
                        <div className="flex gap-1">
                          <Select 
                            onValueChange={(value) => {
                              if (value === "none") {
                                field.onChange(null);
                                form.setValue("careTeam.pharmacy", "");
                              } else {
                                field.onChange(value);
                                const pharmacy = pharmacies.find(p => p.id === value);
                                if (pharmacy) {
                                  form.setValue("careTeam.pharmacy", pharmacy.name);
                                }
                              }
                            }}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-pharmacy">
                                <SelectValue placeholder="Select pharmacy...">
                                  {selectedPharmacy?.name || "Select pharmacy..."}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {pharmacies.map((pharmacy) => (
                                <SelectItem key={pharmacy.id} value={pharmacy.id}>
                                  {pharmacy.name}{pharmacy.deliveryAvailable === "yes" ? " (Delivers)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddProviderDialog 
                            providerType="pharmacy" 
                            onSuccess={(newPharmacy) => {
                              queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
                              field.onChange(newPharmacy.id);
                              form.setValue("careTeam.pharmacy", newPharmacy.name);
                            }}
                          />
                        </div>
                        {selectedPharmacy && (
                          <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                            {selectedPharmacy.phoneNumber && <p>Phone: {selectedPharmacy.phoneNumber}</p>}
                            {selectedPharmacy.faxNumber && <p>Fax: {selectedPharmacy.faxNumber}</p>}
                            {selectedPharmacy.address && <p>Address: {selectedPharmacy.address}</p>}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">GP Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const gpValue = form.watch("careTeam.generalPractitioner");
                  const selectedGP = gps.find(g => gpValue?.includes(g.name));
                  if (!selectedGP) return <p className="text-sm text-muted-foreground">Select a GP above to see contact details</p>;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Name</p>
                        <p className="font-medium">{selectedGP.name}</p>
                      </div>
                      {selectedGP.practiceName && (
                        <div>
                          <p className="text-muted-foreground text-xs">Practice</p>
                          <p>{selectedGP.practiceName}</p>
                        </div>
                      )}
                      {selectedGP.phoneNumber && (
                        <div>
                          <p className="text-muted-foreground text-xs">Phone</p>
                          <p>{selectedGP.phoneNumber}</p>
                        </div>
                      )}
                      {selectedGP.faxNumber && (
                        <div>
                          <p className="text-muted-foreground text-xs">Fax</p>
                          <p>{selectedGP.faxNumber}</p>
                        </div>
                      )}
                      {selectedGP.email && (
                        <div>
                          <p className="text-muted-foreground text-xs">Email</p>
                          <p>{selectedGP.email}</p>
                        </div>
                      )}
                      {selectedGP.address && (
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground text-xs">Address</p>
                          <p>{selectedGP.address}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinical" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="mainDiagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Diagnosis</FormLabel>
                      <Popover open={diagnosisOpen} onOpenChange={setDiagnosisOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal"
                              data-testid="input-diagnosis"
                            >
                              {field.value || "Select or type a diagnosis..."}
                              <span className="ml-2 text-muted-foreground">▼</span>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search diagnoses..."
                              value={diagnosisSearch}
                              onValueChange={(value) => {
                                setDiagnosisSearch(value);
                                field.onChange(value);
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {diagnosisSearch ? (
                                  <div
                                    className="cursor-pointer p-2 hover:bg-accent"
                                    onClick={() => {
                                      field.onChange(diagnosisSearch);
                                      setDiagnosisOpen(false);
                                    }}
                                  >
                                    Create "{diagnosisSearch}"
                                  </div>
                                ) : (
                                  "No diagnoses found"
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                {diagnoses.map((diagnosis) => (
                                  <CommandItem
                                    key={diagnosis}
                                    value={diagnosis}
                                    onSelect={() => {
                                      field.onChange(diagnosis);
                                      setDiagnosisSearch("");
                                      setDiagnosisOpen(false);
                                    }}
                                  >
                                    {diagnosis}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advancedCareDirective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-600 dark:text-purple-400 font-bold">Advanced Care Directive (ACD)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="border-purple-200 dark:border-purple-800" data-testid="select-acd">
                            <SelectValue placeholder="Select directive status..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NFR">NFR - Not For Resuscitation</SelectItem>
                          <SelectItem value="For Resus">For Resus - For Resuscitation</SelectItem>
                          <SelectItem value="None">None / Not Specified</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Document upload required for NFR or For Resus status
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="summaryOfServices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary of Services</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-services-summary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} rows={4} data-testid="input-clinical-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 mt-6">
            {/* Zoho WorkDrive Link */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="zohoWorkdriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zoho WorkDrive Link</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="https://workdrive.zoho.com/..." type="url" data-testid="input-zoho-link" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Link to the client's document folder in Zoho WorkDrive
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinical Document Dates</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clinicalDocuments.serviceAgreementDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Agreement Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-service-agreement" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalDocuments.consentFormDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consent Form Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-consent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalDocuments.riskAssessmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Assessment Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-risk" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalDocuments.medicationConsentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medication Consent Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-medication" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalDocuments.carePlanDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Plan Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-care-plan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalDocuments.healthSummaryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Health Summary Date</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-doc-health-summary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={handleCancelWithWarning} disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {client ? "Update Client" : "Create Client"}
          </Button>
        </div>

        <UnsavedChangesDialog
          open={showWarning}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          description="You have unsaved changes to this client form. Are you sure you want to leave? Your changes will be lost."
        />
      </form>
    </Form>
  );
}
