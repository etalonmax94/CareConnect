import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Users,
  Save,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Search,
} from "lucide-react";
import type { Client, ProgressNote } from "@shared/schema";

interface ClientWithNotes extends Client {
  latestNotes: ProgressNote[];
}

export default function LeadershipMeeting() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientWithNotes | null>(null);
  const [newNote, setNewNote] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const { data: allNotes = [] } = useQuery<ProgressNote[]>({
    queryKey: ["/api/progress-notes"],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { clientId: string; note: string }) => {
      return apiRequest("POST", `/api/clients/${data.clientId}/notes`, {
        clientId: data.clientId,
        note: data.note,
        type: "progress",
        author: "Leadership Team",
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-notes"] });
      toast({
        title: "Note Added",
        description: "Leadership meeting note has been saved.",
      });
      setNewNote("");
      setAddNoteDialogOpen(false);
      setSelectedClient(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group notes by client and get clients with notes
  const clientsWithNotes: ClientWithNotes[] = clients.map((client) => {
    const clientNotes = allNotes
      .filter((note) => note.clientId === client.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      ...client,
      latestNotes: clientNotes,
    };
  });

  // Filter and sort - prioritize clients with recent notes
  const filteredClients = clientsWithNotes
    .filter((client) => {
      if (!search.trim()) return true;
      const searchLower = search.toLowerCase();
      return (
        client.participantName.toLowerCase().includes(searchLower) ||
        client.category.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Prioritize clients with notes
      const aHasNotes = a.latestNotes.length > 0;
      const bHasNotes = b.latestNotes.length > 0;
      if (aHasNotes && !bHasNotes) return -1;
      if (!aHasNotes && bHasNotes) return 1;
      // Then sort by most recent note
      if (aHasNotes && bHasNotes) {
        return new Date(b.latestNotes[0].createdAt).getTime() - new Date(a.latestNotes[0].createdAt).getTime();
      }
      return a.participantName.localeCompare(b.participantName);
    });

  const toggleExpanded = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleAddNote = (client: ClientWithNotes) => {
    setSelectedClient(client);
    setNewNote("");
    setAddNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!selectedClient || !newNote.trim()) return;
    addNoteMutation.mutate({
      clientId: selectedClient.id,
      note: newNote.trim(),
    });
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Leadership Meeting
            </h1>
            <p className="text-muted-foreground">
              Review clients and add meeting notes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredClients.length} clients
          </Badge>
          <Badge variant="outline">
            {filteredClients.filter(c => c.latestNotes.length > 0).length} with notes
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Client Review Table
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-clients"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Client Name</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead>Previous Notes</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <Fragment key={client.id}>
                      <TableRow data-testid={`row-client-${client.id}`}>
                        <TableCell>
                          <Link href={`/clients/${client.id}`}>
                            <span className="font-medium hover:underline cursor-pointer">
                              {client.participantName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(client.category)}>
                            {client.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.latestNotes.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(client.id)}
                                className="h-7 px-2"
                                data-testid={`button-expand-${client.id}`}
                              >
                                {expandedClients.has(client.id) ? (
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                )}
                                {client.latestNotes.length} note{client.latestNotes.length !== 1 ? 's' : ''}
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Last: {formatDate(client.latestNotes[0].createdAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No notes yet</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNote(client)}
                            data-testid={`button-add-note-${client.id}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Note
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedClients.has(client.id) && client.latestNotes.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/50 p-0">
                            <ScrollArea className="max-h-[300px]">
                              <div className="p-4 space-y-3">
                                {client.latestNotes.slice(0, 5).map((note) => (
                                  <div
                                    key={note.id}
                                    className="bg-background rounded-md p-3 border"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {formatDate(note.createdAt)}
                                        </span>
                                        {note.type && (
                                          <Badge variant="outline" className="text-xs">
                                            {note.type.replace("_", " ")}
                                          </Badge>
                                        )}
                                      </div>
                                      {note.author && (
                                        <span className="text-xs text-muted-foreground">
                                          By: {note.author}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                  </div>
                                ))}
                                {client.latestNotes.length > 5 && (
                                  <p className="text-xs text-center text-muted-foreground">
                                    +{client.latestNotes.length - 5} older notes
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add Leadership Meeting Note
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <div>
                  <p className="font-medium">{selectedClient.participantName}</p>
                  <Badge className={getCategoryColor(selectedClient.category)}>
                    {selectedClient.category}
                  </Badge>
                </div>
              </div>
              <Textarea
                placeholder="Enter meeting notes for this client..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={6}
                data-testid="textarea-new-note"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddNoteDialogOpen(false)}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
