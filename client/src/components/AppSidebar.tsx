import { Home, Users, FileText, BarChart3, Settings, UserCog, Building2, Briefcase } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

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
    title: "Documents",
    url: "/documents",
    icon: FileText,
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

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-center">
          <img src={logoImage} alt="EmpowerLink" className="h-8 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-4">
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
    </Sidebar>
  );
}
