import type { Request, RequestSummary } from "../request";
import type { RequestReadAdapter } from "./requests";

const FIXTURES: Request[] = [
  {
    id: "req_mock_001",
    ownerId: "buyer-uuid-1",
    zohoLeadId: "zoho-lead-101",
    submittedAt: "2026-08-20T14:30:00.000Z",
    createdAt: "2026-08-20T14:30:00.000Z",
    updatedAt: "2026-08-20T14:30:00.000Z",
    attachments: [],
    lines: [
      {
        id: "line_1",
        productSlug: "rigid-boxes",
        quantities: [5000, 10000],
        contents: "Skincare serum bottles",
        customizations: [
          { id: "finish-matte", label: "Matte lamination", category: "finish" },
        ],
        addedAt: "2026-08-20T14:28:00.000Z",
      },
    ],
    draft: {
      notes: "Need samples before full run.",
      timeline: "6-8 weeks",
      packagingContents: "Skincare serum bottles",
      expressQuantities: [],
      annualSpend: "100k-250k",
      shippingAddress: {
        line1: "100 King St W",
        city: "Toronto",
        region: "ON",
        country: "CA",
        postalCode: "M5X 1A1",
      },
      companyAddress: null,
      contactFirstName: "Alex",
      contactLastName: "Chen",
      contactEmail: "alex@example.com",
      contactPhone: "+1 416 555 0100",
      contactCompany: "Example Co",
      contactIndustry: "Beauty",
      services: [],
      servicesEnabled: false,
      express: false,
      productsExpanded: true,
      entryKind: "products",
      submittedAt: "2026-08-20T14:30:00.000Z",
      ref: "RFQ-10042",
    },
    versions: [
      {
        number: 1,
        label: "Version 1",
        createdAt: "2026-08-20T14:30:00.000Z",
        summary: "Initial submission",
      },
    ],
    activities: [
      {
        id: "act_001_3",
        kind: "version_created",
        message: "Version 1 created.",
        occurredAt: "2026-08-20T14:30:00.000Z",
        actorType: "system",
        versionNumber: 1,
      },
      {
        id: "act_001_2",
        kind: "submitted",
        message: "Request submitted — RFQ-10042.",
        occurredAt: "2026-08-20T14:30:00.000Z",
        actorName: "Alex Chen",
        actorType: "buyer",
      },
      {
        id: "act_001_1",
        kind: "line_added",
        message: "Product line added — rigid boxes.",
        occurredAt: "2026-08-20T14:28:00.000Z",
        actorName: "Alex Chen",
        actorType: "buyer",
      },
    ],
  },
  {
    id: "req_mock_002",
    ownerId: "buyer-uuid-2",
    zohoLeadId: "zoho-lead-202",
    submittedAt: "2026-08-22T09:15:00.000Z",
    createdAt: "2026-08-22T09:15:00.000Z",
    updatedAt: "2026-08-22T09:15:00.000Z",
    attachments: [
      {
        id: "att-mock-1",
        name: "brand-guide.pdf",
        kind: "brief",
        contentType: "application/pdf",
        bytes: 248_310,
      },
    ],
    lines: [],
    draft: {
      notes: "",
      timeline: "ASAP",
      packagingContents: "Subscription meal kits",
      expressQuantities: [2500],
      annualSpend: "250k+",
      shippingAddress: null,
      companyAddress: null,
      contactFirstName: "Jordan",
      contactLastName: "Lee",
      contactEmail: "jordan@example.com",
      contactPhone: "",
      contactCompany: "MealKit Inc",
      contactIndustry: "Food",
      services: ["design"],
      servicesEnabled: true,
      express: true,
      productsExpanded: false,
      entryKind: "express",
      submittedAt: "2026-08-22T09:15:00.000Z",
      ref: "RFQ-10043",
    },
    versions: [
      {
        number: 1,
        label: "Version 1",
        createdAt: "2026-08-22T09:15:00.000Z",
        summary: "Initial submission",
      },
    ],
    activities: [
      {
        id: "act_002_1",
        kind: "submitted",
        message: "Request submitted — RFQ-10043.",
        occurredAt: "2026-08-22T09:15:00.000Z",
        actorName: "Jordan Lee",
        actorType: "buyer",
      },
    ],
  },
];

/** Maps mock Zoho sales member ids to lead assignments for fixture data. */
const SALES_MEMBER_LEADS: Record<string, string[]> = {
  "zoho-user-sales-1": ["zoho-lead-101"],
  "zoho-user-sales-2": ["zoho-lead-202"],
};

function toSummary(request: Request): RequestSummary {
  return {
    id: request.id,
    ref: request.draft.ref,
    submittedAt: request.submittedAt,
    contactEmail: request.draft.contactEmail,
    contactCompany: request.draft.contactCompany,
    entryKind: request.draft.entryKind,
  };
}

export function createMockRequestReadAdapter(): RequestReadAdapter {
  return {
    async listForSalesMember(zohoUserId: string): Promise<RequestSummary[]> {
      const leadIds = SALES_MEMBER_LEADS[zohoUserId] ?? [];
      return FIXTURES.filter(
        (r) => r.zohoLeadId && leadIds.includes(r.zohoLeadId),
      ).map(toSummary);
    },
    async getById(id: string, zohoUserId: string): Promise<Request | null> {
      const request = FIXTURES.find((r) => r.id === id);
      if (!request?.zohoLeadId) return null;
      const leadIds = SALES_MEMBER_LEADS[zohoUserId] ?? [];
      if (!leadIds.includes(request.zohoLeadId)) return null;
      return request;
    },
  };
}
