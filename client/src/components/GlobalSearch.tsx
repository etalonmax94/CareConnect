import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, User, X } from "lucide-react";
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
import type { Client } from "@shared/schema";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const filteredClients = clients.filter((client) => {
    if (!search.trim()) return false;
    const searchLower = search.toLowerCase();
    const ndisNumber = client.ndisDetails?.ndisNumber;
    const hcpNumber = client.supportAtHomeDetails?.hcpNumber;
    return (
      client.participantName?.toLowerCase().includes(searchLower) ||
      ndisNumber?.toLowerCase().includes(searchLower) ||
      hcpNumber?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phoneNumber?.includes(search)
    );
  });

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

  const handleSelect = (clientId: string) => {
    setOpen(false);
    setSearch("");
    setLocation(`/clients/${clientId}`);
  };

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

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search clients...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Clients
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, NDIS number, email, phone..."
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
          <ScrollArea className="max-h-[300px]">
            <div className="px-2 pb-4">
              {search.trim() === "" ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type to search clients...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No clients found for "{search}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.slice(0, 10).map((client) => (
                    <button
                      key={client.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover-elevate text-left"
                      onClick={() => handleSelect(client.id)}
                      data-testid={`search-result-${client.id}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {client.participantName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.ndisDetails?.ndisNumber || client.supportAtHomeDetails?.hcpNumber || client.email || client.phoneNumber}
                        </p>
                      </div>
                      <Badge className={getCategoryColor(client.category)}>
                        {client.category}
                      </Badge>
                    </button>
                  ))}
                  {filteredClients.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{filteredClients.length - 10} more results
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
