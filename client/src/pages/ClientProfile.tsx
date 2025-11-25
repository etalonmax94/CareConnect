import { useRoute } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CategoryBadge from "@/components/CategoryBadge";
import DocumentTracker from "@/components/DocumentTracker";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2, FileText, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/schema";

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  
  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params?.id],
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Client not found</p>
          <Link href="/clients">
            <Button variant="ghost" className="mt-2">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Client Profile</h1>
        </div>
        <Link href={`/clients/${params?.id}/edit`}>
          <Button data-testid="button-edit-client">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={client.photo} alt={client.participantName} />
                <AvatarFallback className="text-2xl">{getInitials(client.participantName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{client.participantName}</h2>
                    <CategoryBadge category={client.category} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{client.age} years old</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>ID: {client.ndisDetails?.ndisNumber || client.medicareNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  {client.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{client.phoneNumber}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.homeAddress && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{client.homeAddress}</span>
                    </div>
                  )}
                  {client.zohoWorkdriveLink && (
                    <div className="flex items-center gap-2 text-sm">
                      <a href={client.zohoWorkdriveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800" data-testid="link-zoho-workdrive">
                        <FileText className="w-4 h-4" />
                        <span className="flex items-center gap-1">
                          Workdrive
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details" data-testid="tab-details">Personal Details</TabsTrigger>
          <TabsTrigger value="program" data-testid="tab-program">Program Info</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Care Team</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="clinical" data-testid="tab-clinical">Clinical Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="text-sm mt-1">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medicare Number</p>
                  <p className="text-sm mt-1 font-mono">{client.medicareNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next of Kin / EPOA</p>
                  <p className="text-sm mt-1">{client.nokEpoa || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency of Services</p>
                  <p className="text-sm mt-1">{client.frequencyOfServices || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Main Diagnosis</p>
                  <p className="text-sm mt-1">{client.mainDiagnosis || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Communication Needs</p>
                  <p className="text-sm mt-1">{client.communicationNeeds || "No special needs"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Summary of Services</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{client.summaryOfServices || "No summary provided"}</p>
              </CardContent>
            </Card>

            {client.highIntensitySupports && client.highIntensitySupports.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">High Intensity Supports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.highIntensitySupports.map((support, index) => (
                      <Badge key={index} variant="outline">{support}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="program" className="space-y-6">
          {client.ndisDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">NDIS Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">NDIS Number</p>
                  <p className="text-sm mt-1 font-mono">{client.ndisDetails.ndisNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funding Type</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisFundingType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan Start Date</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisPlanStartDate ? new Date(client.ndisDetails.ndisPlanStartDate).toLocaleDateString() : "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan End Date</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisPlanEndDate ? new Date(client.ndisDetails.ndisPlanEndDate).toLocaleDateString() : "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Schedule of Supports / Budget</p>
                  <p className="text-sm mt-1">{client.ndisDetails.scheduleOfSupports || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {client.supportAtHomeDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support at Home Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Program Details</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.programDetails}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funding Source</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.fundingSource}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Service Entitlements</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.serviceEntitlements}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {client.privateClientDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Private Client Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Rates</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.serviceRates}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Billing Preferences</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.billingPreferences}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Primary Care Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.careTeam.careManager && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Care Manager</p>
                    <p className="text-sm mt-1">{client.careTeam.careManager}</p>
                  </div>
                )}
                {client.careTeam.leadership && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Leadership</p>
                    <p className="text-sm mt-1">{client.careTeam.leadership}</p>
                  </div>
                )}
                {client.careTeam.generalPractitioner && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">General Practitioner</p>
                    <p className="text-sm mt-1">{client.careTeam.generalPractitioner}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">NDIS Support Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.careTeam.supportCoordinator && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Support Coordinator</p>
                    <p className="text-sm mt-1">{client.careTeam.supportCoordinator}</p>
                  </div>
                )}
                {client.careTeam.planManager && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan Manager</p>
                    <p className="text-sm mt-1">{client.careTeam.planManager}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {client.careTeam.otherHealthProfessionals && client.careTeam.otherHealthProfessionals.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Allied Health Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {client.careTeam.otherHealthProfessionals.map((professional, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">{professional}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentTracker documents={client.clinicalDocuments} />
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{client.clinicalNotes || "No clinical notes recorded"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium">Regular monitoring session completed</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Client responding well to current care plan. No changes required at this time.</p>
                  <p className="text-xs text-muted-foreground mt-2">By: {client.careTeam.careManager}</p>
                </div>
                <div className="border-l-2 border-muted pl-4 py-2">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium">Medication review completed</p>
                    <p className="text-xs text-muted-foreground">1 week ago</p>
                  </div>
                  <p className="text-sm text-muted-foreground">All medications reviewed with GP. Dosages confirmed as appropriate.</p>
                  <p className="text-xs text-muted-foreground mt-2">By: {client.careTeam.generalPractitioner}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
