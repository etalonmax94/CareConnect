import React, { useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { StaffDocumentUploadDialog } from "@/components/StaffDocumentUploadDialog";
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2,
  FileText, Clock, Users, Pencil, Building2, Award, AlertTriangle,
  Briefcase, UserCircle, Shield, CheckCircle, Camera, Eye, Plus, Trash2,
  CalendarDays, Heart, X, Save, ChevronRight, Upload, Download, FolderOpen,
  AlertCircle, XCircle, CheckCircle2, FileCheck
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  Staff, StaffQualification, StaffEmergencyContact, StaffAvailabilityWindow,
  StaffUnavailabilityPeriod, StaffStatusLog, StaffBlacklist, ClientStaffAssignment,
  StaffDocument, StaffDocumentType
} from "@shared/schema";

type StaffProfileSection =
  | "overview"
  | "personal"
  | "employment"
  | "contact"
  | "documents"
  | "qualifications"
  | "assignments"
  | "availability"
  | "notes";

interface StaffFullProfile extends Staff {
  emergencyContacts: StaffEmergencyContact[];
  qualifications: StaffQualification[];
  documents: StaffDocument[];
  availabilityWindows: StaffAvailabilityWindow[];
  unavailabilityPeriods: StaffUnavailabilityPeriod[];
  currentStatus: StaffStatusLog | null;
  blacklistEntries: StaffBlacklist[];
  clientAssignments: ClientStaffAssignment[];
  supervisor: Pick<Staff, 'id' | 'name' | 'role' | 'email'> | null;
  qualificationsCount: number;
  activeQualificationsCount: number;
  expiringQualificationsCount: number;
  activeClientCount: number;
  documentsCount: number;
  pendingDocumentsCount: number;
  approvedDocumentsCount: number;
  expiringDocumentsCount: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRole(role: string | null): string {
  if (!role) return 'Staff';
  const roleMap: Record<string, string> = {
    support_worker: 'Support Worker',
    nurse: 'Nurse',
    care_manager: 'Care Manager',
    admin: 'Administrator'
  };
  return roleMap[role] || role;
}

function formatEmploymentType(type: string | null): string {
  if (!type) return 'Not specified';
  const typeMap: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    casual: 'Casual',
    contractor: 'Contractor'
  };
  return typeMap[type] || type;
}

function formatDepartment(dept: string | null): string {
  if (!dept) return 'Not specified';
  const deptMap: Record<string, string> = {
    nursing: 'Nursing',
    support_work: 'Support Work',
    management: 'Management',
    administration: 'Administration',
    clinical: 'Clinical'
  };
  return deptMap[dept] || dept;
}

function formatGender(gender: string | null): string {
  if (!gender) return 'Not specified';
  const genderMap: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    non_binary: 'Non-binary',
    prefer_not_to_say: 'Prefer not to say'
  };
  return genderMap[gender] || gender;
}

function formatRelationship(rel: string): string {
  const relMap: Record<string, string> = {
    spouse: 'Spouse',
    partner: 'Partner',
    parent: 'Parent',
    child: 'Child',
    sibling: 'Sibling',
    friend: 'Friend',
    other: 'Other'
  };
  return relMap[rel] || rel;
}

// Staff Document Type Labels
const DOCUMENT_TYPE_LABELS: Record<StaffDocumentType, string> = {
  id_document_1: "ID Document 1",
  id_document_2: "ID Document 2",
  right_to_work: "Right to Work in Australia",
  police_check: "Police Check",
  yellow_card: "Yellow Card | NDIS Worker Screening",
  blue_card: "Blue Card | Work With Children Check",
  nursing_registration: "Nursing Registration",
  qualification_award: "Qualification Award",
  cpr: "CPR",
  first_aid: "First Aid",
  vaccination_record: "Vaccination Record",
  vehicle_insurance: "Vehicle Comprehensive Insurance",
  ndis_orientation: "NDIS Worker Orientation Module",
  ndis_communication: "NDIS Supporting Effective Communication",
  ndis_safe_meals: "NDIS Supporting Safe and Enjoyable Meals",
  hand_hygiene: "Hand Hygiene Training Certificate",
  infection_control: "Infection Control Certificate",
  employment_agreement: "Employment Agreement",
  resume_cv: "Resume and CV",
  position_description: "Position Description",
  commitment_declaration: "Staff Commitment Declaration Form",
  induction_checklist: "Staff Induction Checklist",
};

// Document categories for organization
const DOCUMENT_CATEGORIES: {
  id: string;
  name: string;
  icon: React.ReactNode;
  types: StaffDocumentType[];
}[] = [
  {
    id: "identification",
    name: "Identification",
    icon: <User className="w-5 h-5 text-blue-500" />,
    types: ["id_document_1", "id_document_2", "right_to_work"],
  },
  {
    id: "compliance",
    name: "Compliance & Screening",
    icon: <Shield className="w-5 h-5 text-purple-500" />,
    types: ["police_check", "yellow_card", "blue_card"],
  },
  {
    id: "qualifications",
    name: "Qualifications & Training",
    icon: <Award className="w-5 h-5 text-amber-500" />,
    types: ["nursing_registration", "qualification_award", "cpr", "first_aid"],
  },
  {
    id: "ndis",
    name: "NDIS Training",
    icon: <FileCheck className="w-5 h-5 text-green-500" />,
    types: ["ndis_orientation", "ndis_communication", "ndis_safe_meals"],
  },
  {
    id: "health",
    name: "Health & Safety",
    icon: <Heart className="w-5 h-5 text-red-500" />,
    types: ["vaccination_record", "hand_hygiene", "infection_control"],
  },
  {
    id: "employment",
    name: "Employment Documents",
    icon: <Briefcase className="w-5 h-5 text-slate-500" />,
    types: ["employment_agreement", "resume_cv", "position_description", "commitment_declaration", "induction_checklist"],
  },
  {
    id: "other",
    name: "Other",
    icon: <FileText className="w-5 h-5 text-gray-500" />,
    types: ["vehicle_insurance"],
  },
];

function formatDocumentType(type: StaffDocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

function getDocumentStatusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "rejected": return "bg-red-100 text-red-700 border-red-200";
    case "expired": return "bg-slate-100 text-slate-700 border-slate-200";
    default: return "bg-slate-100 text-slate-600";
  }
}

function getDocumentStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case "approved": return <CheckCircle2 className="w-4 h-4" />;
    case "pending": return <AlertCircle className="w-4 h-4" />;
    case "rejected": return <XCircle className="w-4 h-4" />;
    case "expired": return <Clock className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

export default function StaffProfile() {
  const [, params] = useRoute("/staff/:id");
  const [activeSection, setActiveSection] = useState<StaffProfileSection>("overview");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [addEmergencyContactOpen, setAddEmergencyContactOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [preselectedDocType, setPreselectedDocType] = useState<StaffDocumentType | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form states for inline editing
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSecondaryPhone, setEditSecondaryPhone] = useState("");
  const [editSecondaryEmail, setEditSecondaryEmail] = useState("");
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [editSuburb, setEditSuburb] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostCode, setEditPostCode] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPronouns, setEditPronouns] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editEmploymentStartDate, setEditEmploymentStartDate] = useState("");
  const [editWorkingHours, setEditWorkingHours] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Emergency contact form
  const [ecName, setEcName] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [ecIsPrimary, setEcIsPrimary] = useState(false);

  // Qualification management
  const [addQualificationOpen, setAddQualificationOpen] = useState(false);
  const [editingQualification, setEditingQualification] = useState<StaffQualification | null>(null);
  const [qualFormData, setQualFormData] = useState({
    qualificationType: "",
    qualificationName: "",
    issuingOrganization: "",
    certificationNumber: "",
    issuedDate: "",
    expiryDate: "",
    status: "current" as "current" | "expired" | "pending_renewal" | "suspended",
  });

  // Fetch full profile
  const { data: staff, isLoading } = useQuery<StaffFullProfile>({
    queryKey: [`/api/staff/${params?.id}/full-profile`],
    enabled: !!params?.id,
    refetchOnMount: "always",
  });

  // Fetch all staff for supervisor selector
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Update mutation
  const updateStaffMutation = useMutation({
    mutationFn: async (data: Partial<Staff>) => {
      return apiRequest("PATCH", `/api/staff/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      setEditingField(null);
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  // Create emergency contact mutation
  const createEmergencyContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/staff/${params?.id}/emergency-contacts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      setAddEmergencyContactOpen(false);
      resetEmergencyContactForm();
      toast({ title: "Emergency contact added" });
    },
    onError: () => {
      toast({ title: "Failed to add emergency contact", variant: "destructive" });
    },
  });

  // Delete emergency contact mutation
  const deleteEmergencyContactMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/staff/emergency-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      toast({ title: "Emergency contact deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete emergency contact", variant: "destructive" });
    },
  });

  // Create qualification mutation
  const createQualificationMutation = useMutation({
    mutationFn: async (data: typeof qualFormData) => {
      const res = await fetch(`/api/staff/${params?.id}/qualifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      toast({ title: "Qualification added successfully" });
      setAddQualificationOpen(false);
      resetQualificationForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add qualification", description: error.message, variant: "destructive" });
    },
  });

  // Update qualification mutation
  const updateQualificationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof qualFormData> }) => {
      const res = await fetch(`/api/staff/qualifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      toast({ title: "Qualification updated successfully" });
      setEditingQualification(null);
      resetQualificationForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update qualification", description: error.message, variant: "destructive" });
    },
  });

  // Delete qualification mutation
  const deleteQualificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/qualifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${params?.id}/full-profile`] });
      toast({ title: "Qualification deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete qualification", description: error.message, variant: "destructive" });
    },
  });

  function resetQualificationForm() {
    setQualFormData({
      qualificationType: "",
      qualificationName: "",
      issuingOrganization: "",
      certificationNumber: "",
      issuedDate: "",
      expiryDate: "",
      status: "current",
    });
  }

  function handleEditQualification(qual: StaffQualification) {
    setEditingQualification(qual);
    setQualFormData({
      qualificationType: qual.qualificationType,
      qualificationName: qual.qualificationName,
      issuingOrganization: qual.issuingOrganization || "",
      certificationNumber: qual.certificationNumber || "",
      issuedDate: qual.issuedDate || "",
      expiryDate: qual.expiryDate || "",
      status: (qual.status as "current" | "expired" | "pending_renewal" | "suspended") || "current",
    });
  }

  function handleSaveQualification() {
    if (editingQualification) {
      updateQualificationMutation.mutate({ id: editingQualification.id, data: qualFormData });
    } else {
      createQualificationMutation.mutate(qualFormData);
    }
  }

  function resetEmergencyContactForm() {
    setEcName("");
    setEcRelationship("");
    setEcPhone("");
    setEcEmail("");
    setEcIsPrimary(false);
  }

  function startEditing(field: string) {
    if (!staff) return;
    setEditingField(field);
    switch (field) {
      case "name": setEditName(staff.name || ""); break;
      case "email": setEditEmail(staff.email || ""); break;
      case "phone": setEditPhone(staff.phoneNumber || ""); break;
      case "secondaryPhone": setEditSecondaryPhone(staff.secondaryPhone || ""); break;
      case "secondaryEmail": setEditSecondaryEmail(staff.secondaryEmail || ""); break;
      case "streetAddress": setEditStreetAddress(staff.streetAddress || ""); break;
      case "suburb": setEditSuburb(staff.suburb || ""); break;
      case "state": setEditState(staff.state || ""); break;
      case "postCode": setEditPostCode(staff.postCode || ""); break;
      case "dateOfBirth": setEditDateOfBirth(staff.dateOfBirth || ""); break;
      case "gender": setEditGender(staff.gender || ""); break;
      case "pronouns": setEditPronouns(staff.pronouns || ""); break;
      case "employmentType": setEditEmploymentType(staff.employmentType || ""); break;
      case "department": setEditDepartment(staff.department || ""); break;
      case "employmentStartDate": setEditEmploymentStartDate(staff.employmentStartDate || ""); break;
      case "workingHours": setEditWorkingHours(staff.workingHoursPerWeek || ""); break;
      case "bio": setEditBio(staff.bio || ""); break;
      case "notes": setEditNotes(staff.notes || ""); break;
    }
  }

  function saveField(field: string) {
    const fieldMap: Record<string, any> = {
      name: { name: editName },
      email: { email: editEmail },
      phone: { phoneNumber: editPhone },
      secondaryPhone: { secondaryPhone: editSecondaryPhone },
      secondaryEmail: { secondaryEmail: editSecondaryEmail },
      streetAddress: { streetAddress: editStreetAddress },
      suburb: { suburb: editSuburb },
      state: { state: editState },
      postCode: { postCode: editPostCode },
      dateOfBirth: { dateOfBirth: editDateOfBirth || null },
      gender: { gender: editGender || null },
      pronouns: { pronouns: editPronouns },
      employmentType: { employmentType: editEmploymentType || null },
      department: { department: editDepartment || null },
      employmentStartDate: { employmentStartDate: editEmploymentStartDate || null },
      workingHours: { workingHoursPerWeek: editWorkingHours },
      bio: { bio: editBio },
      notes: { notes: editNotes },
    };
    updateStaffMutation.mutate(fieldMap[field]);
  }

  // Sidebar items
  const sidebarItems: { id: StaffProfileSection; label: string; icon: any; badge?: string; statusDot?: "green" | "orange" | "red" | null }[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "personal", label: "Personal Details", icon: UserCircle },
    { id: "employment", label: "Employment", icon: Briefcase },
    { id: "contact", label: "Contact Info", icon: Phone },
    {
      id: "documents",
      label: "Documents",
      icon: FolderOpen,
      badge: staff?.documentsCount?.toString(),
      statusDot: staff?.pendingDocumentsCount && staff.pendingDocumentsCount > 0
        ? "orange"
        : staff?.expiringDocumentsCount && staff.expiringDocumentsCount > 0
          ? "orange"
          : staff?.approvedDocumentsCount === staff?.documentsCount && (staff?.documentsCount ?? 0) > 0
            ? "green"
            : null
    },
    {
      id: "qualifications",
      label: "Qualifications",
      icon: Award,
      statusDot: staff?.expiringQualificationsCount && staff.expiringQualificationsCount > 0
        ? "orange"
        : staff?.activeQualificationsCount === staff?.qualificationsCount
          ? "green"
          : null
    },
    { id: "assignments", label: "Assigned Clients", icon: Users, badge: staff?.activeClientCount?.toString() },
    { id: "availability", label: "Availability", icon: CalendarDays },
    { id: "notes", label: "Notes", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-lg text-muted-foreground">Staff member not found</p>
        <Link href="/staff">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Staff List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full -m-4 sm:-m-6 flex flex-col">
      {/* Profile Header */}
      <div className="bg-card border-b px-3 sm:px-6 py-3 sm:py-5">
        <div className="flex items-start gap-2 sm:gap-4">
          <Link href="/staff">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          {/* Avatar */}
          <Dialog>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />
            <DialogTrigger asChild>
              <div className="relative group cursor-pointer flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-border rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {staff.profileImageUrl ? (
                    <img src={staff.profileImageUrl} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-xl md:text-2xl text-foreground font-bold">{getInitials(staff.name)}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Staff Photo</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  {staff.profileImageUrl ? (
                    <img src={staff.profileImageUrl} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl text-foreground font-bold">{getInitials(staff.name)}</span>
                  )}
                </div>
                <p className="text-lg font-semibold">{staff.name}</p>
                <Button onClick={() => photoInputRef.current?.click()} className="gap-2">
                  <Camera className="w-4 h-4" />
                  {staff.profileImageUrl ? "Change Photo" : "Upload Photo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">{staff.name}</h1>
              <Badge className={`${staff.isActive === "yes" ? "bg-emerald-500" : "bg-slate-500"} text-white border-0`}>
                {staff.isActive === "yes" ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              <Badge variant="outline">{formatRole(staff.role)}</Badge>
              {staff.department && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {formatDepartment(staff.department)}
                  </span>
                </>
              )}
              {staff.supervisor && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Reports to: {staff.supervisor.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-sm flex-wrap">
              {staff.email && (
                <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">{staff.email}</span>
                </a>
              )}
              {staff.phoneNumber && (
                <a href={`tel:${staff.phoneNumber}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">{staff.phoneNumber}</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/staff/${staff.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden border-b bg-background overflow-x-auto">
        <nav className="flex p-2 gap-1 min-w-max">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
              {item.statusDot && (
                <span className={`w-2 h-2 rounded-full ${
                  item.statusDot === 'green' ? 'bg-emerald-500' :
                  item.statusDot === 'orange' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              )}
              {item.badge && (
                <span className="ml-1 text-[10px]">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation - Desktop only */}
        <div className="w-56 border-r bg-muted/30 flex-shrink-0 hidden lg:block">
          <div className="p-4 border-b">
            <p className="font-semibold text-sm">Staff Profile</p>
            <p className="text-xs text-muted-foreground">Navigate sections</p>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <nav className="p-2 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.statusDot && (
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      item.statusDot === 'green' ? 'bg-emerald-500' :
                      item.statusDot === 'orange' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  )}
                  {item.badge && (
                    <span className="text-xs text-muted-foreground">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.activeClientCount}</p>
                        <p className="text-xs text-muted-foreground">Assigned Clients</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.activeQualificationsCount}/{staff.qualificationsCount}</p>
                        <p className="text-xs text-muted-foreground">Qualifications</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.availabilityWindows?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Availability Windows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-2xl font-bold">{formatEmploymentType(staff.employmentType)}</p>
                        <p className="text-xs text-muted-foreground">Employment Type</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Primary Phone</p>
                      <p className="font-medium">{staff.phoneNumber || "Not set"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{staff.email || "Not set"}</p>
                    </div>
                    {staff.secondaryPhone && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Secondary Phone</p>
                        <p className="font-medium">{staff.secondaryPhone}</p>
                      </div>
                    )}
                    {staff.streetAddress && (
                      <div className="space-y-1 md:col-span-2">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {[staff.streetAddress, staff.suburb, staff.state, staff.postCode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contacts Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Emergency Contacts
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setAddEmergencyContactOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {staff.emergencyContacts?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No emergency contacts added</p>
                  ) : (
                    <div className="space-y-3">
                      {staff.emergencyContacts?.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.name}</p>
                              {contact.isPrimary === "yes" && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{formatRelationship(contact.relationship)}</p>
                            <p className="text-sm">{contact.phoneNumber}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteEmergencyContactMutation.mutate(contact.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Qualifications Preview */}
              {staff.qualifications && staff.qualifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Qualifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {staff.qualifications.slice(0, 3).map((qual) => (
                        <div key={qual.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium">{qual.qualificationName}</p>
                            <p className="text-xs text-muted-foreground">{qual.issuingOrganization}</p>
                          </div>
                          <Badge variant={qual.status === "current" ? "default" : qual.status === "expired" ? "destructive" : "secondary"}>
                            {qual.status}
                          </Badge>
                        </div>
                      ))}
                      {staff.qualifications.length > 3 && (
                        <Button variant="ghost" className="w-full" onClick={() => setActiveSection("qualifications")}>
                          View all {staff.qualifications.length} qualifications
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Personal Details Section */}
          {activeSection === "personal" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date of Birth */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      {editingField === "dateOfBirth" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="date"
                            value={editDateOfBirth}
                            onChange={(e) => setEditDateOfBirth(e.target.value)}
                            className="w-48"
                          />
                          <Button size="sm" onClick={() => saveField("dateOfBirth")} disabled={updateStaffMutation.isPending}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString('en-AU') : "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "dateOfBirth" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("dateOfBirth")}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      {editingField === "gender" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={editGender} onValueChange={setEditGender}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="non_binary">Non-binary</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => saveField("gender")} disabled={updateStaffMutation.isPending}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium">{formatGender(staff.gender)}</p>
                      )}
                    </div>
                    {editingField !== "gender" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("gender")}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Pronouns */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Pronouns</p>
                      {editingField === "pronouns" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={editPronouns}
                            onChange={(e) => setEditPronouns(e.target.value)}
                            placeholder="e.g., she/her, he/him, they/them"
                            className="w-48"
                          />
                          <Button size="sm" onClick={() => saveField("pronouns")} disabled={updateStaffMutation.isPending}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.pronouns || "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "pronouns" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("pronouns")}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Street Address</Label>
                      {editingField === "streetAddress" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editStreetAddress} onChange={(e) => setEditStreetAddress(e.target.value)} />
                          <Button size="sm" onClick={() => saveField("streetAddress")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{staff.streetAddress || "Not set"}</p>
                          <Button variant="ghost" size="sm" onClick={() => startEditing("streetAddress")}><Pencil className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Suburb</Label>
                      {editingField === "suburb" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editSuburb} onChange={(e) => setEditSuburb(e.target.value)} />
                          <Button size="sm" onClick={() => saveField("suburb")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{staff.suburb || "Not set"}</p>
                          <Button variant="ghost" size="sm" onClick={() => startEditing("suburb")}><Pencil className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State</Label>
                      {editingField === "state" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editState} onChange={(e) => setEditState(e.target.value)} />
                          <Button size="sm" onClick={() => saveField("state")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{staff.state || "Not set"}</p>
                          <Button variant="ghost" size="sm" onClick={() => startEditing("state")}><Pencil className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Post Code</Label>
                      {editingField === "postCode" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editPostCode} onChange={(e) => setEditPostCode(e.target.value)} />
                          <Button size="sm" onClick={() => saveField("postCode")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{staff.postCode || "Not set"}</p>
                          <Button variant="ghost" size="sm" onClick={() => startEditing("postCode")}><Pencil className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employment Section */}
          {activeSection === "employment" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Employment Type */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Employment Type</p>
                      {editingField === "employmentType" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={editEmploymentType} onValueChange={setEditEmploymentType}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_time">Full Time</SelectItem>
                              <SelectItem value="part_time">Part Time</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="contractor">Contractor</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => saveField("employmentType")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{formatEmploymentType(staff.employmentType)}</p>
                      )}
                    </div>
                    {editingField !== "employmentType" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("employmentType")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Department */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      {editingField === "department" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={editDepartment} onValueChange={setEditDepartment}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nursing">Nursing</SelectItem>
                              <SelectItem value="support_work">Support Work</SelectItem>
                              <SelectItem value="management">Management</SelectItem>
                              <SelectItem value="administration">Administration</SelectItem>
                              <SelectItem value="clinical">Clinical</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => saveField("department")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{formatDepartment(staff.department)}</p>
                      )}
                    </div>
                    {editingField !== "department" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("department")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Employment Start Date</p>
                      {editingField === "employmentStartDate" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input type="date" value={editEmploymentStartDate} onChange={(e) => setEditEmploymentStartDate(e.target.value)} className="w-48" />
                          <Button size="sm" onClick={() => saveField("employmentStartDate")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.employmentStartDate ? new Date(staff.employmentStartDate).toLocaleDateString('en-AU') : "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "employmentStartDate" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("employmentStartDate")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Working Hours */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Working Hours Per Week</p>
                      {editingField === "workingHours" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editWorkingHours} onChange={(e) => setEditWorkingHours(e.target.value)} placeholder="e.g., 38" className="w-24" />
                          <Button size="sm" onClick={() => saveField("workingHours")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.workingHoursPerWeek ? `${staff.workingHoursPerWeek} hours` : "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "workingHours" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("workingHours")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Supervisor */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Supervisor</p>
                      <p className="font-medium">{staff.supervisor?.name || "Not assigned"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contact Section */}
          {activeSection === "contact" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Primary Phone */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Primary Phone</p>
                      {editingField === "phone" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-48" />
                          <Button size="sm" onClick={() => saveField("phone")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.phoneNumber || "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "phone" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("phone")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Secondary Phone */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Secondary Phone</p>
                      {editingField === "secondaryPhone" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={editSecondaryPhone} onChange={(e) => setEditSecondaryPhone(e.target.value)} className="w-48" />
                          <Button size="sm" onClick={() => saveField("secondaryPhone")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.secondaryPhone || "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "secondaryPhone" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("secondaryPhone")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      {editingField === "email" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-64" />
                          <Button size="sm" onClick={() => saveField("email")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.email || "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "email" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("email")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {/* Secondary Email */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Secondary Email</p>
                      {editingField === "secondaryEmail" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input type="email" value={editSecondaryEmail} onChange={(e) => setEditSecondaryEmail(e.target.value)} className="w-64" />
                          <Button size="sm" onClick={() => saveField("secondaryEmail")}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <p className="font-medium">{staff.secondaryEmail || "Not set"}</p>
                      )}
                    </div>
                    {editingField !== "secondaryEmail" && (
                      <Button variant="ghost" size="sm" onClick={() => startEditing("secondaryEmail")}><Pencil className="w-4 h-4" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      Emergency Contacts
                    </CardTitle>
                    <CardDescription>People to contact in case of emergency</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddEmergencyContactOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Contact
                  </Button>
                </CardHeader>
                <CardContent>
                  {staff.emergencyContacts?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No emergency contacts added yet</p>
                      <Button variant="outline" className="mt-4" onClick={() => setAddEmergencyContactOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Emergency Contact
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staff.emergencyContacts?.map((contact) => (
                        <div key={contact.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{contact.name}</p>
                              {contact.isPrimary === "yes" && (
                                <Badge className="bg-red-100 text-red-700 border-red-200">Primary</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{formatRelationship(contact.relationship)}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <a href={`tel:${contact.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Phone className="w-3.5 h-3.5" />
                                {contact.phoneNumber}
                              </a>
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary hover:underline">
                                  <Mail className="w-3.5 h-3.5" />
                                  {contact.email}
                                </a>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteEmergencyContactMutation.mutate(contact.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === "documents" && (
            <div className="space-y-6">
              {/* Section Header with Upload Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Staff Documents
                  </h2>
                  <p className="text-sm text-muted-foreground">Compliance documents, certifications, and employment records</p>
                </div>
                <Button
                  onClick={() => {
                    setPreselectedDocType(undefined);
                    setUploadDocumentOpen(true);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload Document
                </Button>
              </div>

              {/* Document Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.documentsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Total Documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.approvedDocumentsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Approved</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.pendingDocumentsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Pending Review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.expiringDocumentsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Expiring Soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Categories */}
              {DOCUMENT_CATEGORIES.map((category) => {
                const categoryDocs = staff.documents?.filter(doc =>
                  category.types.includes(doc.documentType as StaffDocumentType)
                ) || [];
                const missingTypes = category.types.filter(type =>
                  !staff.documents?.some(doc => doc.documentType === type)
                );

                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {category.icon}
                        {category.name}
                      </CardTitle>
                      <CardDescription>
                        {categoryDocs.length} of {category.types.length} documents uploaded
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Uploaded Documents */}
                        {categoryDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${getDocumentStatusColor(doc.status)}`}>
                                {getDocumentStatusIcon(doc.status)}
                              </div>
                              <div>
                                <p className="font-medium">{formatDocumentType(doc.documentType as StaffDocumentType)}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{doc.documentName}</span>
                                  {doc.expiryDate && (
                                    <>
                                      <span>•</span>
                                      <span className={new Date(doc.expiryDate) < new Date() ? "text-red-500" : ""}>
                                        Expires: {new Date(doc.expiryDate).toLocaleDateString('en-AU')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                doc.status === "approved" ? "default" :
                                doc.status === "pending" ? "secondary" :
                                doc.status === "rejected" ? "destructive" : "outline"
                              }>
                                {doc.status === "approved" ? "Approved" :
                                 doc.status === "pending" ? "Pending Review" :
                                 doc.status === "rejected" ? "Rejected" : "Expired"}
                              </Badge>
                              {doc.fileUrl && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Missing Documents */}
                        {missingTypes.map((type) => (
                          <div key={type} className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-gray-100">
                                <Upload className="w-4 h-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">{formatDocumentType(type)}</p>
                                <p className="text-xs text-muted-foreground">Not uploaded</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPreselectedDocType(type);
                                setUploadDocumentOpen(true);
                              }}
                            >
                              <Upload className="w-4 h-4 mr-1" /> Upload
                            </Button>
                          </div>
                        ))}

                        {categoryDocs.length === 0 && missingTypes.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            <p>No documents in this category</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Qualifications Section */}
          {activeSection === "qualifications" && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Qualifications & Certifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {staff.activeQualificationsCount} of {staff.qualificationsCount} qualifications are current
                  </p>
                </div>
                <Button onClick={() => {
                  resetQualificationForm();
                  setAddQualificationOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Qualification
                </Button>
              </div>

              {/* Qualification Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.qualificationsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.activeQualificationsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Current</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold">{staff.expiringQualificationsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Expiring Soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">
                          {(staff.qualifications?.filter(q => q.status === "expired")?.length || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Expired</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Qualifications List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Qualifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.qualifications?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No qualifications recorded yet</p>
                      <Button variant="outline" className="mt-4" onClick={() => {
                        resetQualificationForm();
                        setAddQualificationOpen(true);
                      }}>
                        <Plus className="w-4 h-4 mr-2" /> Add First Qualification
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staff.qualifications?.map((qual) => {
                        const daysUntilExpiry = qual.expiryDate
                          ? Math.floor((new Date(qual.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          : null;
                        const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

                        return (
                          <div key={qual.id} className={`p-4 border rounded-lg ${
                            qual.status === "expired" ? "border-red-200 bg-red-50/30 dark:bg-red-900/10" :
                            isExpiringSoon ? "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10" : ""
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{qual.qualificationName}</h4>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {qual.qualificationType?.replace(/_/g, " ") || "Other"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{qual.issuingOrganization || "Not specified"}</p>
                                {qual.certificationNumber && (
                                  <p className="text-xs text-muted-foreground mt-1">Cert #: {qual.certificationNumber}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  {qual.issuedDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Issued: {new Date(qual.issuedDate).toLocaleDateString('en-AU')}
                                    </span>
                                  )}
                                  {qual.expiryDate && (
                                    <span className={`flex items-center gap-1 ${
                                      qual.status === "expired" ? "text-red-600" :
                                      isExpiringSoon ? "text-yellow-600" : ""
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      {qual.status === "expired"
                                        ? `Expired: ${new Date(qual.expiryDate).toLocaleDateString('en-AU')}`
                                        : isExpiringSoon
                                        ? `Expires in ${daysUntilExpiry} days`
                                        : `Expires: ${new Date(qual.expiryDate).toLocaleDateString('en-AU')}`
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant={
                                  qual.status === "current" ? "default" :
                                  qual.status === "expired" ? "destructive" :
                                  qual.status === "pending_renewal" ? "secondary" : "outline"
                                }>
                                  {qual.status === "current" ? "Current" :
                                   qual.status === "expired" ? "Expired" :
                                   qual.status === "pending_renewal" ? "Pending Renewal" :
                                   qual.status === "suspended" ? "Suspended" : qual.status}
                                </Badge>
                                <Button variant="ghost" size="icon" onClick={() => handleEditQualification(qual)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this qualification?")) {
                                      deleteQualificationMutation.mutate(qual.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
          )}

          {/* Assigned Clients Section */}
          {activeSection === "assignments" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Assigned Clients
                  </CardTitle>
                  <CardDescription>
                    {staff.activeClientCount} client{staff.activeClientCount !== 1 ? 's' : ''} assigned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {staff.clientAssignments?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No clients assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {staff.clientAssignments?.map((assignment) => (
                        <Link key={assignment.id} href={`/clients/${assignment.clientId}`}>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>CL</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">Client #{assignment.clientId.slice(0, 8)}</p>
                                <p className="text-xs text-muted-foreground capitalize">{assignment.assignmentType?.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Availability Section */}
          {activeSection === "availability" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Weekly Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.availabilityWindows?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No availability windows set</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                        const dayWindows = staff.availabilityWindows?.filter(w => String(w.dayOfWeek) === String(index)) || [];
                        return (
                          <div key={day} className="flex items-center gap-4 py-2 border-b last:border-0">
                            <p className="w-24 font-medium">{day}</p>
                            {dayWindows.length === 0 ? (
                              <p className="text-muted-foreground text-sm">Not available</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {dayWindows.map((w) => (
                                  <Badge key={w.id} variant="secondary">
                                    {w.startTime} - {w.endTime}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unavailability Periods */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Leave / Unavailability</CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.unavailabilityPeriods?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No upcoming leave periods</p>
                  ) : (
                    <div className="space-y-2">
                      {staff.unavailabilityPeriods?.map((period) => (
                        <div key={period.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium capitalize">{period.unavailabilityType?.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(period.startDate).toLocaleDateString('en-AU')} - {new Date(period.endDate).toLocaleDateString('en-AU')}
                            </p>
                            {period.reason && <p className="text-xs text-muted-foreground mt-1">{period.reason}</p>}
                          </div>
                          <Badge variant={period.status === "approved" ? "default" : period.status === "rejected" ? "destructive" : "secondary"}>
                            {period.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notes Section */}
          {activeSection === "notes" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingField === "bio" ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Write a short professional bio..."
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveField("bio")} disabled={updateStaffMutation.isPending}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm whitespace-pre-wrap">{staff.bio || "No bio written yet"}</p>
                      <Button variant="ghost" size="sm" onClick={() => startEditing("bio")}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>General Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {editingField === "notes" ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes about this staff member..."
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveField("notes")} disabled={updateStaffMutation.isPending}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm whitespace-pre-wrap">{staff.notes || "No notes added"}</p>
                      <Button variant="ghost" size="sm" onClick={() => startEditing("notes")}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Emergency Contact Dialog */}
      <Dialog open={addEmergencyContactOpen} onOpenChange={setAddEmergencyContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
            <DialogDescription>Add a new emergency contact for this staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ec-name">Name *</Label>
              <Input id="ec-name" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-relationship">Relationship *</Label>
              <Select value={ecRelationship} onValueChange={setEcRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-phone">Phone Number *</Label>
              <Input id="ec-phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-email">Email (Optional)</Label>
              <Input id="ec-email" type="email" value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} placeholder="Email address" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ec-primary"
                checked={ecIsPrimary}
                onChange={(e) => setEcIsPrimary(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="ec-primary">Set as primary contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmergencyContactOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createEmergencyContactMutation.mutate({
                name: ecName,
                relationship: ecRelationship,
                phoneNumber: ecPhone,
                email: ecEmail || undefined,
                isPrimary: ecIsPrimary ? "yes" : "no",
              })}
              disabled={!ecName || !ecRelationship || !ecPhone || createEmergencyContactMutation.isPending}
            >
              {createEmergencyContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <StaffDocumentUploadDialog
        staffId={staff?.id || ""}
        open={uploadDocumentOpen}
        onOpenChange={setUploadDocumentOpen}
        preselectedType={preselectedDocType}
      />

      {/* Add/Edit Qualification Dialog */}
      <Dialog
        open={addQualificationOpen || !!editingQualification}
        onOpenChange={(open) => {
          if (!open) {
            setAddQualificationOpen(false);
            setEditingQualification(null);
            resetQualificationForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQualification ? "Edit Qualification" : "Add New Qualification"}
            </DialogTitle>
            <DialogDescription>
              {editingQualification ? "Update qualification details" : "Add a new qualification for this staff member"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qual-type">Qualification Type *</Label>
              <Select
                value={qualFormData.qualificationType}
                onValueChange={(value) => setQualFormData({ ...qualFormData, qualificationType: value })}
              >
                <SelectTrigger id="qual-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nursing">Nursing</SelectItem>
                  <SelectItem value="first_aid">First Aid</SelectItem>
                  <SelectItem value="cpr">CPR</SelectItem>
                  <SelectItem value="manual_handling">Manual Handling</SelectItem>
                  <SelectItem value="medication_admin">Medication Administration</SelectItem>
                  <SelectItem value="behavioral_support">Behavioural Support</SelectItem>
                  <SelectItem value="complex_care">Complex Care</SelectItem>
                  <SelectItem value="infection_control">Infection Control</SelectItem>
                  <SelectItem value="food_safety">Food Safety</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qual-name">Qualification Name *</Label>
              <Input
                id="qual-name"
                value={qualFormData.qualificationName}
                onChange={(e) => setQualFormData({ ...qualFormData, qualificationName: e.target.value })}
                placeholder="e.g., Registered Nurse, Certificate III in Individual Support"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qual-org">Issuing Organisation</Label>
              <Input
                id="qual-org"
                value={qualFormData.issuingOrganization}
                onChange={(e) => setQualFormData({ ...qualFormData, issuingOrganization: e.target.value })}
                placeholder="e.g., AHPRA, St John Ambulance, TAFE"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qual-cert">Certification Number</Label>
              <Input
                id="qual-cert"
                value={qualFormData.certificationNumber}
                onChange={(e) => setQualFormData({ ...qualFormData, certificationNumber: e.target.value })}
                placeholder="e.g., NUR123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qual-issued">Issue Date</Label>
              <Input
                id="qual-issued"
                type="date"
                value={qualFormData.issuedDate}
                onChange={(e) => setQualFormData({ ...qualFormData, issuedDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qual-expiry">Expiry Date</Label>
              <Input
                id="qual-expiry"
                type="date"
                value={qualFormData.expiryDate}
                onChange={(e) => setQualFormData({ ...qualFormData, expiryDate: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="qual-status">Status *</Label>
              <Select
                value={qualFormData.status}
                onValueChange={(value: "current" | "expired" | "pending_renewal" | "suspended") =>
                  setQualFormData({ ...qualFormData, status: value })
                }
              >
                <SelectTrigger id="qual-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddQualificationOpen(false);
                setEditingQualification(null);
                resetQualificationForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQualification}
              disabled={
                !qualFormData.qualificationType ||
                !qualFormData.qualificationName ||
                createQualificationMutation.isPending ||
                updateQualificationMutation.isPending
              }
            >
              {(createQualificationMutation.isPending || updateQualificationMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {editingQualification ? "Update" : "Add"} Qualification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
