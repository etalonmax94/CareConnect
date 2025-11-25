import { Home, Users, FileText, BarChart3, Settings, UserCog, Building2, Briefcase, LogOut, User, Stethoscope, Pill, Calculator } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
  isFirstLogin: string;
}

interface AppSidebarProps {
  user?: UserInfo | null;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Staff",
    url: "/staff",
    icon: UserCog,
  },
  {
    title: "Support Coordinators",
    url: "/support-coordinators",
    icon: Building2,
  },
  {
    title: "Plan Managers",
    url: "/plan-managers",
    icon: Briefcase,
  },
  {
    title: "GPs",
    url: "/gps",
    icon: Stethoscope,
  },
  {
    title: "Pharmacies",
    url: "/pharmacies",
    icon: Pill,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Quotes",
    url: "/quotes",
    icon: Calculator,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/login";
    },
  });

  const displayName = user?.firstName || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-center">
          <img src={logoImage} alt="EmpowerLink" className="h-8 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-4">
        {/* User Greeting */}
        {user && (
          <div className="px-3 py-3 mb-2">
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium" data-testid="text-user-greeting">
                Hi {displayName}
              </span>
            </div>
          </div>
        )}
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <div className={`
                        flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium
                        transition-colors cursor-pointer
                        ${isActive 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                        }
                      `}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Logout Footer */}
      {user && (
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
