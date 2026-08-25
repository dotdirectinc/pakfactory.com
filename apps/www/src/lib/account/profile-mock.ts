export type ProfileContact = {
    name: string;
    email: string;
    phone: string;
    company: string;
    industry: string;
};

export type ProfileAddress = {
    id: string;
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
};

export type ProfileMock = {
    contact: ProfileContact;
    companyAddress: ProfileAddress | null;
    shippingAddresses: ProfileAddress[];
    marketingEmail: boolean;
};

export const PROFILE_MOCK: ProfileMock = {
    contact: {
        name: 'Alex Buyer',
        email: 'alex.buyer@example.com',
        phone: '+1 (555) 010-2000',
        company: 'Example Brand Co.',
        industry: 'Beauty & personal care',
    },
    companyAddress: null,
    shippingAddresses: [],
    marketingEmail: true,
};
