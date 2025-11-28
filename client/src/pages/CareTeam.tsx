import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Stethoscope, Pill, HeartPulse, Briefcase, Building2, Users, ChevronRight, Plus, Loader2, Phone, Mail, UserCog } from "lucide-react";
import type { GP, Pharmacy, AlliedHealthProfessional, PlanManager, SupportCoordinator, Staff, Client } from "@shared/schema";

interface ProviderTileProps {
  title: string;
  description: string;
  icon: typeof Stethoscope;
  iconColor: string;
  bgColor: string;
  count: number;
  href: string;
  recentItems: Array<{ id: string; name: string; subtitle?: string }>;
  isLoading: boolean;
}

function ProviderTile({ title, description, icon: Icon, iconColor, bgColor, count, href, recentItems, isLoading }: ProviderTileProps) {
  return (
    <Card className="hover-elevate transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${bgColor}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg font-semibold px-3">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</p>
            <div className="space-y-2">
              {recentItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{item.name}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">No records yet</p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Link href={href} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CareTeam() {
  const { data: gps = [], isLoading: isLoadingGPs } = useQuery<GP[]>({
    queryKey: ["/api/gps"],
  });

  const { data: pharmacies = [], isLoading: isLoadingPharmacies } = useQuery<Pharmacy[]>({
    queryKey: ["/api/pharmacies"],
  });

  const { data: alliedHealth = [], isLoading: isLoadingAlliedHealth } = useQuery<AlliedHealthProfessional[]>({
    queryKey: ["/api/allied-health-professionals"],
  });

  const { data: planManagers = [], isLoading: isLoadingPlanManagers } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  const { data: supportCoordinators = [], isLoading: isLoadingSupportCoordinators } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const totalProviders = gps.length + pharmacies.length + alliedHealth.length + planManagers.length + supportCoordinators.length;

  const clientsWithCareTeam = clients.filter(c => 
    c.careTeam?.generalPractitioner || 
    c.careTeam?.careManagerId || 
    c.careTeam?.supportCoordinatorId || 
    c.careTeam?.planManagerId ||
    c.careTeam?.alliedHealthProfessionalId ||
    c.generalPractitionerId ||
    c.pharmacyId
  ).length;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">Care Team Directory</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage all healthcare providers and external services</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Users className="w-4 h-4 mr-1" />
            {totalProviders} Providers
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {clientsWithCareTeam} Clients Linked
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProviderTile
          title="Staff"
          description="Internal care workers"
          icon={UserCog}
          iconColor="text-cyan-600"
          bgColor="bg-cyan-100 dark:bg-cyan-900/30"
          count={staff.length}
          href="/staff"
          isLoading={isLoadingStaff}
          recentItems={staff.slice(-3).reverse().map(s => ({
            id: s.id,
            name: s.name,
            subtitle: s.role || undefined
          }))}
        />

        <ProviderTile
          title="Support Coordinators"
          description="NDIS support coordination"
          icon={Building2}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-100 dark:bg-indigo-900/30"
          count={supportCoordinators.length}
          href="/support-coordinators"
          isLoading={isLoadingSupportCoordinators}
          recentItems={supportCoordinators.slice(-3).reverse().map(sc => ({
            id: sc.id,
            name: sc.name,
            subtitle: sc.organisation || undefined
          }))}
        />

        <ProviderTile
          title="Plan Managers"
          description="NDIS plan management"
          icon={Briefcase}
          iconColor="text-pink-600"
          bgColor="bg-pink-100 dark:bg-pink-900/30"
          count={planManagers.length}
          href="/plan-managers"
          isLoading={isLoadingPlanManagers}
          recentItems={planManagers.slice(-3).reverse().map(pm => ({
            id: pm.id,
            name: pm.name,
            subtitle: pm.organisation || undefined
          }))}
        />

        <ProviderTile
          title="Allied Health"
          description="Therapists and specialists"
          icon={HeartPulse}
          iconColor="text-violet-600"
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          count={alliedHealth.length}
          href="/allied-health-professionals"
          isLoading={isLoadingAlliedHealth}
          recentItems={alliedHealth.slice(-3).reverse().map(ah => ({
            id: ah.id,
            name: ah.name,
            subtitle: ah.specialty
          }))}
        />

        <ProviderTile
          title="General Practitioners"
          description="Doctors and medical practices"
          icon={Stethoscope}
          iconColor="text-rose-600"
          bgColor="bg-rose-100 dark:bg-rose-900/30"
          count={gps.length}
          href="/gps"
          isLoading={isLoadingGPs}
          recentItems={gps.slice(-3).reverse().map(gp => ({
            id: gp.id,
            name: gp.name,
            subtitle: gp.practiceName || undefined
          }))}
        />

        <ProviderTile
          title="Pharmacies"
          description="Medication dispensaries"
          icon={Pill}
          iconColor="text-teal-600"
          bgColor="bg-teal-100 dark:bg-teal-900/30"
          count={pharmacies.length}
          href="/pharmacies"
          isLoading={isLoadingPharmacies}
          recentItems={pharmacies.slice(-3).reverse().map(p => ({
            id: p.id,
            name: p.name,
            subtitle: p.deliveryAvailable === "yes" ? "Delivery Available" : undefined
          }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/gps">
              <Button variant="outline" size="sm" data-testid="button-quick-gps">
                <Plus className="w-4 h-4 mr-1" />
                Add GP
              </Button>
            </Link>
            <Link href="/pharmacies">
              <Button variant="outline" size="sm" data-testid="button-quick-pharmacies">
                <Plus className="w-4 h-4 mr-1" />
                Add Pharmacy
              </Button>
            </Link>
            <Link href="/allied-health-professionals">
              <Button variant="outline" size="sm" data-testid="button-quick-allied-health">
                <Plus className="w-4 h-4 mr-1" />
                Add Allied Health
              </Button>
            </Link>
            <Link href="/plan-managers">
              <Button variant="outline" size="sm" data-testid="button-quick-plan-managers">
                <Plus className="w-4 h-4 mr-1" />
                Add Plan Manager
              </Button>
            </Link>
            <Link href="/support-coordinators">
              <Button variant="outline" size="sm" data-testid="button-quick-support-coordinators">
                <Plus className="w-4 h-4 mr-1" />
                Add Support Coordinator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
