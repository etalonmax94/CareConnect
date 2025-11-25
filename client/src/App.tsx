import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import NotFound from "@/pages/not-found";

function Router() {
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

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background z-50">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-y-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
