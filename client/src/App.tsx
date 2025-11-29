import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import GlobalSearch from "@/components/GlobalSearch";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { Button } from "@/components/ui/button";
import { extractAndStoreTokenFromUrl } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientProfile from "@/pages/ClientProfile";
import AddClient from "@/pages/AddClient";
import EditClient from "@/pages/EditClient";
import Staff from "@/pages/Staff";
import StaffProfile from "@/pages/StaffProfile";
import SupportCoordinators from "@/pages/SupportCoordinators";
import PlanManagers from "@/pages/PlanManagers";
import GPs from "@/pages/GPs";
import Pharmacies from "@/pages/Pharmacies";
import AlliedHealthProfessionals from "@/pages/AlliedHealthProfessionals";
import CareTeam from "@/pages/CareTeam";
import OrgChart from "@/pages/OrgChart";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import AuditLog from "@/pages/AuditLog";
import LeadershipMeeting from "@/pages/LeadershipMeeting";
import Quotes from "@/pages/Quotes";
import QuoteEditor from "@/pages/QuoteEditor";
import Appointments from "@/pages/Appointments";
import FormTemplates from "@/pages/FormTemplates";
import SilHouses from "@/pages/SilHouses";
import Login from "@/pages/Login";
import SelectRole from "@/pages/SelectRole";
import PendingApproval from "@/pages/PendingApproval";
import UserApprovals from "@/pages/UserApprovals";
import HelpDesk from "@/pages/HelpDesk";
import Tasks from "@/pages/Tasks";
import Chat from "@/pages/Chat";
import AdminChat from "@/pages/AdminChat";
import Notifications from "@/pages/Notifications";
import SchedulingConflicts from "@/pages/SchedulingConflicts";
import TimesheetApproval from "@/pages/TimesheetApproval";
import GpsComplianceReview from "@/pages/GpsComplianceReview";
import StaffQualifications from "@/pages/StaffQualifications";
import StaffDocumentReview from "@/pages/StaffDocumentReview";
import MobileClockPortal from "@/pages/MobileClockPortal";
import LearningManagement from "@/pages/LearningManagement";
import PolicyManagement from "@/pages/PolicyManagement";
import Scheduling from "@/pages/Scheduling";
import ASCSCalendar from "@/pages/ASCSCalendar";
import ShiftTemplates from "@/pages/ShiftTemplates";
import SchedulingAnalytics from "@/pages/SchedulingAnalytics";
import NotFound from "@/pages/not-found";
import NotificationBell from "@/components/NotificationBell";
import QuickChatPanel from "@/components/QuickChatPanel";
import HelpWidget from "@/components/HelpWidget";
import { Loader2, ExternalLink, Calendar, Mail } from "lucide-react";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

interface AuthResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
    firstName?: string | null;
    lastName?: string | null;
    roles: string[];
    isFirstLogin: string;
    approvalStatus?: string;
  } | null;
  needsRoleSelection?: boolean;
}

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/new" component={AddClient} />
      <Route path="/clients/:id/edit" component={EditClient} />
      <Route path="/clients/:id" component={ClientProfile} />
      <Route path="/staff" component={Staff} />
      <Route path="/staff/:id" component={StaffProfile} />
      <Route path="/org-chart" component={OrgChart} />
      <Route path="/care-team" component={CareTeam} />
      <Route path="/support-coordinators" component={SupportCoordinators} />
      <Route path="/plan-managers" component={PlanManagers} />
      <Route path="/gps" component={GPs} />
      <Route path="/pharmacies" component={Pharmacies} />
      <Route path="/allied-health-professionals" component={AlliedHealthProfessionals} />
      <Route path="/documents" component={PolicyManagement} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/quotes/:id" component={QuoteEditor} />
      <Route path="/appointments" component={Scheduling} />
      <Route path="/form-templates" component={FormTemplates} />
      <Route path="/sil-houses" component={SilHouses} />
      <Route path="/reports" component={Reports} />
      <Route path="/audit-log" component={AuditLog} />
      <Route path="/leadership-meeting" component={LeadershipMeeting} />
      <Route path="/settings" component={Settings} />
      <Route path="/user-approvals" component={UserApprovals} />
      <Route path="/help-desk" component={HelpDesk} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/chat" component={Chat} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/scheduling-conflicts" component={SchedulingConflicts} />
      <Route path="/timesheet-approval" component={TimesheetApproval} />
      <Route path="/gps-compliance" component={GpsComplianceReview} />
      <Route path="/staff-qualifications" component={StaffQualifications} />
      <Route path="/staff-documents" component={StaffDocumentReview} />
      <Route path="/mobile-clock" component={MobileClockPortal} />
      <Route path="/learning" component={LearningManagement} />
      <Route path="/ascs-calendar" component={ASCSCalendar} />
      <Route path="/shift-templates" component={ShiftTemplates} />
      <Route path="/scheduling-analytics" component={SchedulingAnalytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ user }: { user: NonNullable<AuthResponse["user"]> }) {
  const [location] = useLocation();
  const isDashboard = location === "/";
  const isChatPage = location === "/chat";
  const [userToggledSidebar, setUserToggledSidebar] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen (iPhone size < 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-collapse sidebar on mobile, auto-expand on dashboard (desktop only)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else if (isDashboard) {
      setSidebarOpen(true);
      setUserToggledSidebar(false);
    } else if (!userToggledSidebar) {
      setSidebarOpen(false);
    }
  }, [isDashboard, userToggledSidebar, isMobile]);

  const handleSidebarChange = (open: boolean) => {
    setSidebarOpen(open);
    if (!isDashboard && !isMobile) {
      setUserToggledSidebar(true);
    }
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarChange} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between w-full px-4 py-2 border-b sticky top-0 bg-background z-50 gap-4">
            <div className="flex items-center gap-4 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="md:hidden" />
              <img src={logoImage} alt="EmpowerLink" className="h-7 w-auto hidden sm:block" />
            </div>
            <div className="flex-1 flex justify-center max-w-2xl mx-auto">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open("https://mail.zoho.com.au", "_blank")}
                    data-testid="button-zoho-email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoho Email</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open("https://app.connecteam.com", "_blank")}
                    data-testid="button-connecteam"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open Connecteam</p>
                </TooltipContent>
              </Tooltip>
              <QuickChatPanel userId={user.id} userName={user.displayName} />
              <NotificationBell userId={user.id} userName={user.displayName} />
              <UserProfileDropdown user={user} />
            </div>
          </header>
          <main className={`flex-1 ${isChatPage ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
            <ProtectedRouter />
          </main>
          <HelpWidget />
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  
  useEffect(() => {
    const tokenExtracted = extractAndStoreTokenFromUrl();
    if (tokenExtracted) {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, []);
  
  const { data: auth, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 30000,
  });

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle login page - show if not authenticated
  if (location === "/login") {
    if (auth?.authenticated) {
      // Already authenticated, redirect appropriately
      if (auth.needsRoleSelection) {
        return <Redirect to="/select-role" />;
      }
      return <Redirect to="/" />;
    }
    return <Login />;
  }

  // Handle select-role page
  if (location === "/select-role") {
    if (!auth?.authenticated) {
      return <Redirect to="/login" />;
    }
    if (!auth.needsRoleSelection) {
      return <Redirect to="/" />;
    }
    return <SelectRole />;
  }

  // Handle pending-approval page
  if (location === "/pending-approval") {
    if (!auth?.authenticated) {
      return <Redirect to="/login" />;
    }
    if (auth.user?.approvalStatus === "approved") {
      return <Redirect to="/" />;
    }
    return <PendingApproval />;
  }

  // For all other routes, require full authentication
  if (!auth?.authenticated) {
    return <Redirect to="/login" />;
  }

  // Check if user is pending approval or rejected
  if (auth.user?.approvalStatus === "pending" || auth.user?.approvalStatus === "rejected") {
    return <Redirect to="/pending-approval" />;
  }

  if (auth.needsRoleSelection) {
    return <Redirect to="/select-role" />;
  }

  // Fully authenticated with roles - show main app
  return <AuthenticatedApp user={auth.user!} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
