import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client, type ClientCategory, type SupportCoordinator, type PlanManager, type Staff, type GP, type Pharmacy } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: InsertClient) => Promise<void>;
  onCancel: () => void;
}

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory>(client?.category || "NDIS");

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

  // Filter staff by role for care managers
  const careManagers = allStaff.filter(s => s.role === "care_manager" && s.isActive === "yes");

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: client || {
      category: "NDIS",
      participantName: "",
      careTeam: {},
      clinicalDocuments: {},
      highIntensitySupports: [],
      notificationPreferences: {},
    } as any,
  });

  const handleSubmit = async (data: InsertClient) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="team">Care Team</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="participantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participant Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" data-testid="input-name" />
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
                  name="homeAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Home Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Street, City, State, Postcode" data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="mainDiagnosis"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Main Diagnosis</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-diagnosis" />
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
                  name="advancedCareDirective"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
                        <Input {...field} value={field.value || ""} data-testid="input-communication" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zohoWorkdriveLink"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Zoho Workdrive Link</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="https://workdrive.zoho.com/..." type="url" data-testid="input-zoho-link" />
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-6 mt-6">
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
                        <FormLabel>Funding Type</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Core + Capacity Building" data-testid="input-funding-type" />
                        </FormControl>
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
                    name="supportAtHomeDetails.hcpNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HCP Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-hcp-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supportAtHomeDetails.hcpFundingLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HCP Funding Level</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Level 1-4" data-testid="input-hcp-level" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.leadership"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leadership</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-leadership" />
                      </FormControl>
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
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value === "none" ? undefined : value);
                          // Also set the display name for backwards compatibility
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
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value === "none" ? undefined : value);
                          // Also set the display name for backwards compatibility
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pharmacyId"
                  render={({ field }) => {
                    const selectedPharmacy = pharmacies.find(p => p.id === field.value);
                    return (
                      <FormItem>
                        <FormLabel>Pharmacy</FormLabel>
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {client ? "Update Client" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
