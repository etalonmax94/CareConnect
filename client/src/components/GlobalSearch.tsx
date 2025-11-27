import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, User, Users, Briefcase, Building2, Phone, X, FileText, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Client, Staff, SupportCoordinator, PlanManager, Document } from "@shared/schema";

type SearchResultType = "client" | "staff" | "support_coordinator" | "plan_manager" | "document";

interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  subtitle: string;
  phone?: string;
  badge?: string;
  badgeColor?: string;
  clientId?: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: supportCoordinators = [] } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  const { data: planManagers = [] } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents/search", search],
    enabled: search.trim().length >= 2,
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "NDIS":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Support at Home":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Private":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "nurse":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
      case "care_manager":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "admin":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    }
  };

  const formatRole = (role: string) => {
    return role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const searchResults: SearchResult[] = (() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase();
    const results: SearchResult[] = [];

    clients.forEach((client) => {
      const ndisNumber = client.ndisDetails?.ndisNumber;
      const sahNumber = client.supportAtHomeDetails?.sahNumber;
      const matches =
        client.participantName?.toLowerCase().includes(searchLower) ||
        ndisNumber?.toLowerCase().includes(searchLower) ||
        sahNumber?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phoneNumber?.includes(search);

      if (matches) {
        results.push({
          id: client.id,
          type: "client",
          name: client.participantName,
          subtitle: ndisNumber || sahNumber || client.email || "",
          phone: client.phoneNumber ?? undefined,
          badge: client.category,
          badgeColor: getCategoryColor(client.category),
        });
      }
    });

    staff.forEach((member) => {
      const matches =
        member.name?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.phoneNumber?.includes(search);

      if (matches) {
        results.push({
          id: member.id,
          type: "staff",
          name: member.name,
          subtitle: member.email || "",
          phone: member.phoneNumber ?? undefined,
          badge: member.role ? formatRole(member.role) : "Staff",
          badgeColor: getRoleColor(member.role || "support_worker"),
        });
      }
    });

    supportCoordinators.forEach((coordinator) => {
      const matches =
        coordinator.name?.toLowerCase().includes(searchLower) ||
        coordinator.email?.toLowerCase().includes(searchLower) ||
        coordinator.organisation?.toLowerCase().includes(searchLower) ||
        coordinator.phoneNumber?.includes(search);

      if (matches) {
        results.push({
          id: coordinator.id,
          type: "support_coordinator",
          name: coordinator.name,
          subtitle: coordinator.organisation || coordinator.email || "",
          phone: coordinator.phoneNumber ?? undefined,
          badge: "Support Coord",
          badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
        });
      }
    });

    planManagers.forEach((manager) => {
      const matches =
        manager.name?.toLowerCase().includes(searchLower) ||
        manager.email?.toLowerCase().includes(searchLower) ||
        manager.organisation?.toLowerCase().includes(searchLower) ||
        manager.phoneNumber?.includes(search);

      if (matches) {
        results.push({
          id: manager.id,
          type: "plan_manager",
          name: manager.name,
          subtitle: manager.organisation || manager.email || "",
          phone: manager.phoneNumber ?? undefined,
          badge: "Plan Manager",
          badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        });
      }
    });

    documents.forEach((doc) => {
      const clientForDoc = clients.find(c => c.id === doc.clientId);
      results.push({
        id: doc.id,
        type: "document",
        name: doc.customTitle || doc.fileName,
        subtitle: `${doc.documentType} • ${clientForDoc?.participantName || "Unknown Client"}`,
        badge: doc.folderId || doc.documentType,
        badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        clientId: doc.clientId,
      });
    });

    return results;
  })();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearch("");
    switch (result.type) {
      case "client":
        setLocation(`/clients/${result.id}`);
        break;
      case "staff":
        setLocation(`/staff?highlight=${result.id}`);
        break;
      case "support_coordinator":
        setLocation(`/support-coordinators?highlight=${result.id}`);
        break;
      case "plan_manager":
        setLocation(`/plan-managers?highlight=${result.id}`);
        break;
      case "document":
        if (result.clientId) {
          setLocation(`/clients/${result.clientId}?tab=documents`);
        }
        break;
    }
  };

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case "client":
        return <User className="w-4 h-4 text-primary" />;
      case "staff":
        return <Users className="w-4 h-4 text-pink-500" />;
      case "support_coordinator":
        return <Briefcase className="w-4 h-4 text-teal-500" />;
      case "plan_manager":
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case "document":
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case "client":
        return "Client";
      case "staff":
        return "Staff";
      case "support_coordinator":
        return "Support Coordinator";
      case "plan_manager":
        return "Plan Manager";
      case "document":
        return "Document";
    }
  };

  const groupedResults = {
    client: searchResults.filter((r) => r.type === "client"),
    staff: searchResults.filter((r) => r.type === "staff"),
    support_coordinator: searchResults.filter((r) => r.type === "support_coordinator"),
    plan_manager: searchResults.filter((r) => r.type === "plan_manager"),
    document: searchResults.filter((r) => r.type === "document"),
  };

  const hasResults = searchResults.length > 0;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return (
    <>
      <button
        className="relative flex items-center h-10 w-full max-w-md bg-muted/50 hover:bg-muted border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4 mr-3 flex-shrink-0" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {isMac ? "⌘" : "Ctrl"}+K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Global Search
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, staff, coordinators, documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
                data-testid="input-global-search"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="px-2 pb-4">
              {search.trim() === "" ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <p>Search across the entire system</p>
                  <p className="text-xs mt-2">Clients, Staff, Coordinators, Plan Managers, Documents</p>
                </div>
              ) : !hasResults ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found for "{search}"
                </div>
              ) : (
                <div className="space-y-4">
                  {(["client", "staff", "support_coordinator", "plan_manager", "document"] as SearchResultType[]).map((type) => {
                    const results = groupedResults[type];
                    if (results.length === 0) return null;

                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                          {getTypeIcon(type)}
                          <span>{getTypeLabel(type)}s ({results.length})</span>
                        </div>
                        <div className="space-y-1">
                          {results.slice(0, 5).map((result) => (
                            <button
                              key={`${result.type}-${result.id}`}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover-elevate text-left"
                              onClick={() => handleSelect(result)}
                              data-testid={`search-result-${result.type}-${result.id}`}
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {getTypeIcon(result.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {result.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {result.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {result.phone}
                                    </span>
                                  )}
                                  {result.subtitle && !result.phone && (
                                    <span className="truncate">{result.subtitle}</span>
                                  )}
                                  {result.phone && result.subtitle && (
                                    <span className="truncate">| {result.subtitle}</span>
                                  )}
                                </div>
                              </div>
                              {result.badge && (
                                <Badge className={result.badgeColor}>
                                  {result.badge}
                                </Badge>
                              )}
                            </button>
                          ))}
                          {results.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground pt-1">
                              +{results.length - 5} more {getTypeLabel(type).toLowerCase()}s
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
