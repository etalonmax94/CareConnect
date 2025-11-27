import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, FileText, Send, Check, X, Clock, Trash2, Eye, DollarSign, Users, TrendingUp, AlertCircle, ChevronsUpDown, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote, Client } from "@shared/schema";

type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

const STATUS_CONFIG: Record<QuoteStatus, { label: string; icon: JSX.Element; className: string }> = {
  draft: { 
    label: "Draft", 
    icon: <FileText className="w-3 h-3" />, 
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" 
  },
  sent: { 
    label: "Sent", 
    icon: <Send className="w-3 h-3" />, 
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  accepted: { 
    label: "Accepted", 
    icon: <Check className="w-3 h-3" />, 
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
  },
  declined: { 
    label: "Declined", 
    icon: <X className="w-3 h-3" />, 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
  },
  expired: { 
    label: "Expired", 
    icon: <Clock className="w-3 h-3" />, 
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
  },
};

export default function Quotes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: { clientId: string; title: string; description?: string; validUntil?: string }) => {
      return apiRequest("POST", "/api/quotes", data);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setCreateOpen(false);
      setSelectedClientId("");
      setQuoteTitle("");
      setQuoteDescription("");
      setValidUntil("");
      toast({ title: "Quote created successfully" });
      
      const quote = await response.json();
      setLocation(`/quotes/${quote.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create quote", description: error.message, variant: "destructive" });
    }
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote deleted" });
    },
  });

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === "" || 
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.participantName || "Unknown Client";
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = useMemo(() => {
    return clients
      .filter(c => c.isArchived !== "yes")
      .filter(c => 
        clientSearchTerm === "" ||
        c.participantName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        (c.ndisDetails as any)?.ndisNumber?.toLowerCase().includes(clientSearchTerm.toLowerCase())
      );
  }, [clients, clientSearchTerm]);

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    totalValue: quotes
      .filter(q => q.status === "accepted")
      .reduce((sum, q) => sum + parseFloat(q.totalAmount || "0"), 0),
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="quotes-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold">Quotes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage NDIS service quotations and estimates</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto" data-testid="button-create-quote">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
              <DialogDescription>
                Create an NDIS service quotation for a client
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between font-normal"
                      data-testid="select-quote-client"
                    >
                      {selectedClient ? (
                        <div className="flex items-center gap-2 truncate">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{selectedClient.participantName}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">{selectedClient.category}</Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Type client name to search...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search by name or NDIS number..." 
                        value={clientSearchTerm}
                        onValueChange={setClientSearchTerm}
                        data-testid="input-client-search"
                      />
                      <CommandList>
                        {filteredClients.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {clientSearchTerm.length > 0 
                              ? "No clients found." 
                              : "Type to search clients..."}
                          </div>
                        )}
                        {filteredClients.length > 0 && (
                          <CommandGroup heading="Clients">
                          {filteredClients.slice(0, 10).map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => {
                                setSelectedClientId(client.id);
                                setClientSearchOpen(false);
                                setClientSearchTerm("");
                              }}
                              className="cursor-pointer"
                              data-testid={`client-option-${client.id}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{client.participantName}</p>
                                    {(client.ndisDetails as any)?.ndisNumber && (
                                      <p className="text-xs text-muted-foreground">
                                        NDIS: {(client.ndisDetails as any).ndisNumber}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">{client.category}</Badge>
                              </div>
                              {selectedClientId === client.id && (
                                <Check className="ml-2 h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedClient && (
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{selectedClient.participantName}</span>
                      <Badge variant="secondary">{selectedClient.category}</Badge>
                    </div>
                    {(selectedClient.ndisDetails as any)?.ndisNumber && (
                      <p className="text-xs text-muted-foreground">
                        NDIS Number: {(selectedClient.ndisDetails as any).ndisNumber}
                      </p>
                    )}
                    {selectedClient.phoneNumber && (
                      <p className="text-xs text-muted-foreground">
                        Phone: {selectedClient.phoneNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Quote Title *</Label>
                <Input
                  placeholder="e.g., Weekly Support Services Estimate"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  data-testid="input-quote-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the quote..."
                  value={quoteDescription}
                  onChange={(e) => setQuoteDescription(e.target.value)}
                  data-testid="input-quote-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  data-testid="input-quote-valid-until"
                />
              </div>
              <Button
                onClick={() => createQuoteMutation.mutate({
                  clientId: selectedClientId,
                  title: quoteTitle,
                  description: quoteDescription || undefined,
                  validUntil: validUntil || undefined
                })}
                disabled={!selectedClientId || !quoteTitle.trim() || createQuoteMutation.isPending}
                className="w-full"
                data-testid="button-submit-quote"
              >
                Create Quote
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.draft + stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-quotes"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No quotes found</p>
              <p className="text-sm text-muted-foreground mt-1">Create a new quote to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => {
                const statusConfig = STATUS_CONFIG[quote.status as QuoteStatus] || STATUS_CONFIG.draft;
                return (
                  <div
                    key={quote.id}
                    className="p-4 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/quotes/${quote.id}`)}
                    data-testid={`quote-row-${quote.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{quote.quoteNumber}</span>
                          <Badge variant="secondary" className={`${statusConfig.className} gap-1`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="font-medium">{quote.title}</h3>
                        <p className="text-sm text-muted-foreground">{getClientName(quote.clientId)}</p>
                        {quote.validUntil && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Valid until: {new Date(quote.validUntil).toLocaleDateString('en-AU')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold">${parseFloat(quote.totalAmount || "0").toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(quote.createdAt).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/quotes/${quote.id}`);
                            }}
                            data-testid={`button-view-quote-${quote.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {quote.status === "draft" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this quote?")) {
                                  deleteQuoteMutation.mutate(quote.id);
                                }
                              }}
                              data-testid={`button-delete-quote-${quote.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
