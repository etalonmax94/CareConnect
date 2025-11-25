import type { Client } from "@shared/schema";
import photo1 from "@assets/generated_images/female_client_profile_photo.png";
import photo2 from "@assets/generated_images/male_senior_client_photo.png";
import photo3 from "@assets/generated_images/young_female_client_photo.png";
import photo4 from "@assets/generated_images/male_client_profile_photo.png";
import photo5 from "@assets/generated_images/senior_female_client_photo.png";

// todo: remove mock functionality
export const mockClients: Client[] = [
  {
    id: "1",
    category: "NDIS",
    participantName: "Margaret Thompson",
    photo: photo1,
    dateOfBirth: "1965-03-15",
    age: 59,
    homeAddress: "42 Collins Street, Melbourne VIC 3000",
    phoneNumber: "0412 345 678",
    email: "margaret.t@email.com",
    medicareNumber: "2123 45678 9",
    nokEpoa: "John Thompson (Spouse) - 0413 456 789",
    frequencyOfServices: "3 times weekly",
    mainDiagnosis: "Multiple Sclerosis",
    summaryOfServices: "Personal care, physiotherapy support, community access",
    communicationNeeds: "Clear verbal communication, prefers written instructions",
    highIntensitySupports: ["PEG feeding"],
    careTeam: {
      careManager: "Sarah Wilson",
      leadership: "Dr. James Chen",
      generalPractitioner: "Dr. Emily Roberts",
      supportCoordinator: "Michael Brown",
      planManager: "Care Plan Solutions",
      otherHealthProfessionals: ["Physiotherapist: Jane Smith", "Occupational Therapist: Tom Lee"]
    },
    ndisDetails: {
      ndisNumber: "430123456",
      ndisFundingType: "Core + Capacity Building",
      ndisPlanStartDate: "2024-01-15",
      ndisPlanEndDate: "2025-01-14",
      scheduleOfSupports: "$45,000 annually",
      ndisConsentFormDate: "2024-01-10"
    },
    clinicalDocuments: {
      serviceAgreementDate: "2024-01-15",
      consentFormDate: "2024-01-15",
      riskAssessmentDate: "2024-01-20",
      medicationConsentDate: "2024-01-15",
      personalEmergencyPlanDate: "2024-01-25",
      carePlanDate: "2024-07-15",
      healthSummaryDate: "2024-07-20",
      woundCarePlanDate: "2024-02-01"
    },
    clinicalNotes: "Regular monitoring required for medication compliance",
    createdAt: "2024-01-15T00:00:00Z"
  },
  {
    id: "2",
    category: "Support at Home",
    participantName: "Robert Anderson",
    photo: photo2,
    dateOfBirth: "1942-08-22",
    age: 82,
    homeAddress: "15 Beach Road, Bondi NSW 2026",
    phoneNumber: "0423 567 890",
    email: "robert.a@email.com",
    medicareNumber: "3234 56789 0",
    nokEpoa: "Lisa Anderson (Daughter) - 0424 678 901",
    frequencyOfServices: "Daily visits",
    mainDiagnosis: "Parkinson's Disease, Diabetes Type 2",
    summaryOfServices: "Medication management, personal hygiene, meal preparation",
    communicationNeeds: "Patient with speech, allow time for responses",
    highIntensitySupports: ["SC injections"],
    careTeam: {
      careManager: "Patricia Green",
      leadership: "Dr. Helen Morrison",
      generalPractitioner: "Dr. Alan Cooper",
      otherHealthProfessionals: ["Dietitian: Rebecca Hall"]
    },
    supportAtHomeDetails: {
      programDetails: "Commonwealth Home Support Programme",
      fundingSource: "My Aged Care",
      serviceEntitlements: "Level 3 package"
    },
    clinicalDocuments: {
      serviceAgreementDate: "2023-11-01",
      consentFormDate: "2023-11-01",
      riskAssessmentDate: "2024-11-05",
      medicationConsentDate: "2024-11-01",
      carePlanDate: "2024-05-15",
      healthSummaryDate: "2024-05-20"
    },
    clinicalNotes: "Falls risk - walking frame required at all times",
    createdAt: "2023-11-01T00:00:00Z"
  },
  {
    id: "3",
    category: "Private",
    participantName: "Emma Richardson",
    photo: photo3,
    dateOfBirth: "1988-11-30",
    age: 36,
    homeAddress: "78 Park Avenue, Brisbane QLD 4000",
    phoneNumber: "0434 789 012",
    email: "emma.rich@email.com",
    medicareNumber: "4345 67890 1",
    nokEpoa: "David Richardson (Partner) - 0435 890 123",
    frequencyOfServices: "Twice weekly",
    mainDiagnosis: "Post-operative recovery (hip replacement)",
    summaryOfServices: "Physiotherapy, personal care assistance",
    communicationNeeds: "No special requirements",
    highIntensitySupports: [],
    careTeam: {
      careManager: "Jennifer White",
      generalPractitioner: "Dr. Mark Stevens",
      otherHealthProfessionals: ["Physiotherapist: Andrew Martin"]
    },
    privateClientDetails: {
      paymentMethod: "Direct debit",
      serviceRates: "$85/hour",
      billingPreferences: "Monthly invoicing"
    },
    clinicalDocuments: {
      serviceAgreementDate: "2024-10-01",
      consentFormDate: "2024-10-01",
      riskAssessmentDate: "2024-10-05",
      carePlanDate: "2024-10-10",
      healthSummaryDate: "2024-10-15"
    },
    clinicalNotes: "Expected full recovery within 3 months",
    createdAt: "2024-10-01T00:00:00Z"
  },
  {
    id: "4",
    category: "NDIS",
    participantName: "David Martinez",
    photo: photo4,
    dateOfBirth: "1995-05-12",
    age: 29,
    homeAddress: "23 River Street, Perth WA 6000",
    phoneNumber: "0445 901 234",
    email: "david.m@email.com",
    medicareNumber: "5456 78901 2",
    nokEpoa: "Maria Martinez (Mother) - 0446 012 345",
    frequencyOfServices: "5 times weekly",
    mainDiagnosis: "Autism Spectrum Disorder, Intellectual Disability",
    summaryOfServices: "Daily living skills training, community participation, behavioral support",
    communicationNeeds: "Visual aids helpful, structured routine important",
    highIntensitySupports: ["SPC - Specialist Positive Behaviour Support"],
    careTeam: {
      careManager: "Thomas Anderson",
      leadership: "Dr. Sophie Taylor",
      generalPractitioner: "Dr. Lisa Nguyen",
      supportCoordinator: "Rachel Kim",
      planManager: "Plan Partners",
      otherHealthProfessionals: ["Psychologist: Dr. James Wilson", "Speech Therapist: Anna Chen"]
    },
    ndisDetails: {
      ndisNumber: "430234567",
      ndisFundingType: "Core + Capacity Building + Capital",
      ndisPlanStartDate: "2024-03-01",
      ndisPlanEndDate: "2025-02-28",
      scheduleOfSupports: "$78,000 annually",
      ndisConsentFormDate: "2024-02-25"
    },
    clinicalDocuments: {
      serviceAgreementDate: "2024-03-01",
      consentFormDate: "2024-03-01",
      riskAssessmentDate: "2024-03-10",
      medicationConsentDate: "2024-03-01",
      personalEmergencyPlanDate: "2024-03-15",
      carePlanDate: "2024-09-01",
      healthSummaryDate: "2024-09-05"
    },
    clinicalNotes: "Positive progress with social skills development",
    createdAt: "2024-03-01T00:00:00Z"
  },
  {
    id: "5",
    category: "Support at Home",
    participantName: "Helen Carter",
    photo: photo5,
    dateOfBirth: "1938-12-05",
    age: 86,
    homeAddress: "91 Mountain View Road, Adelaide SA 5000",
    phoneNumber: "0456 123 456",
    email: "helen.c@email.com",
    medicareNumber: "6567 89012 3",
    nokEpoa: "Susan Carter (Daughter) - 0457 234 567",
    frequencyOfServices: "Daily morning visits",
    mainDiagnosis: "Dementia, Hypertension",
    summaryOfServices: "Medication prompts, meal preparation, social support",
    communicationNeeds: "Short simple sentences, familiar caregiver preferred",
    highIntensitySupports: [],
    careTeam: {
      careManager: "Amanda Foster",
      leadership: "Dr. Richard Thompson",
      generalPractitioner: "Dr. Catherine Woods",
      otherHealthProfessionals: ["Geriatrician: Dr. Paul Anderson"]
    },
    supportAtHomeDetails: {
      programDetails: "Commonwealth Home Support Programme",
      fundingSource: "My Aged Care",
      serviceEntitlements: "Level 4 package"
    },
    clinicalDocuments: {
      serviceAgreementDate: "2023-06-15",
      consentFormDate: "2023-06-15",
      riskAssessmentDate: "2024-06-20",
      medicationConsentDate: "2024-06-15",
      personalEmergencyPlanDate: "2023-07-01",
      carePlanDate: "2024-06-25",
      healthSummaryDate: "2024-06-30"
    },
    clinicalNotes: "Memory deteriorating, family involved in care decisions",
    createdAt: "2023-06-15T00:00:00Z"
  }
];
