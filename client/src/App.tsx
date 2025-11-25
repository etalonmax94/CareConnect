import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientProfile from "@/pages/ClientProfile";
import AddClient from "@/pages/AddClient";
import EditClient from "@/pages/EditClient";
import Staff from "@/pages/Staff";
import SupportCoordinators from "@/pages/SupportCoordinators";
import PlanManagers from "@/pages/PlanManagers";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Login from "@/pages/Login";
import SelectRole from "@/pages/SelectRole";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

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
      <Route path="/support-coordinators" component={SupportCoordinators} />
      <Route path="/plan-managers" component={PlanManagers} />
      <Route path="/documents" component={() => <div className="p-6"><h1 className="text-2xl font-semibold">Documents</h1><p className="text-muted-foreground mt-2">Document management coming soon</p></div>} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ user }: { user: NonNullable<AuthResponse["user"]> }) {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <ProtectedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  
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

  // For all other routes, require full authentication
  if (!auth?.authenticated) {
    return <Redirect to="/login" />;
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
