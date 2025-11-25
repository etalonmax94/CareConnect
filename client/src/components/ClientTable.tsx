import { useState } from "react";
import type { Client, ClientCategory } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CategoryBadge from "./CategoryBadge";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Eye, Search } from "lucide-react";

interface ClientTableProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
}

export default function ClientTable({ clients, onViewClient }: ClientTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | "All">("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => {
    const matchesCategory = selectedCategory === "All" || client.category === selectedCategory;
    const matchesSearch = client.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.careTeam.careManager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.ndisDetails?.ndisNumber?.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ClientCategory | "All")} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="All" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="NDIS" data-testid="tab-ndis">NDIS</TabsTrigger>
            <TabsTrigger value="Support at Home" data-testid="tab-support-at-home">Support at Home</TabsTrigger>
            <TabsTrigger value="Private" data-testid="tab-private">Private</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, NDIS numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Care Manager</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => {
              const complianceStatus = getComplianceStatus(client.clinicalDocuments.carePlanDate);
              return (
                <TableRow key={client.id} className="hover-elevate" data-testid={`row-client-${client.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={client.photo} alt={client.participantName} />
                        <AvatarFallback>{getInitials(client.participantName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.participantName}</p>
                        <p className="text-sm text-muted-foreground">{client.age} years</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={client.category} />
                  </TableCell>
                  <TableCell>{client.careTeam.careManager || "Not assigned"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {client.ndisDetails?.ndisNumber || client.medicareNumber || "-"}
                  </TableCell>
                  <TableCell>
                    <ComplianceIndicator status={complianceStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewClient(client)}
                      data-testid={`button-view-${client.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clients found matching your search.</p>
        </div>
      )}
    </div>
  );
}
