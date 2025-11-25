import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client, type ClientCategory } from "@shared/schema";
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
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-care-manager" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-gp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.supportCoordinator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Coordinator</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-coordinator" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careTeam.planManager"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Plan Manager</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-plan-manager" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
