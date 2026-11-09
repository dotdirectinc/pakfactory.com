import type {RequestFormRules} from '@/lib/request/validation';

/**
 * Request form rules (PROD-3181). The brief is always required (owner, Oct 29);
 * the company address is optional.
 */
export const REQUEST_FORM_RULES: RequestFormRules = {
    briefOptionalWithProducts: false,
    companyAddressOptional: true,
};
