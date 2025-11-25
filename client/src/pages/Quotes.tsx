import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Send, Check, X, Clock, Trash2, Eye, DollarSign, Users, TrendingUp, AlertCircle } from "lucide-react";
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
    <div className="p-6 space-y-6" data-testid="quotes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">Manage NDIS service quotations and estimates</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-quote">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-quote-client">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => !c.isArchived).map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.participantName} - {client.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
