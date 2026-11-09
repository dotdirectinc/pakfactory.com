import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import type {RequestFormRules} from '@/lib/request/validation';

/** What a screen's rules can look at. */
export type IntakeContext = {
    draft: RequestDraft;
    /** The request's products (product request); empty elsewhere. */
    lines: RequestLine[];
    signedIn: boolean;
    rules: RequestFormRules;
};

export type IntakeScreenDef<K extends string = string> = {
    key: K;
    /** Is this screen on the buyer's path right now? (skip when known, offer when a rule is met) */
    show: (ctx: IntakeContext) => boolean;
    /** Has the buyer answered enough to continue? */
    ready: (ctx: IntakeContext) => boolean;
};

export type IntakeFlowDef<K extends string = string> = {
    id: string;
    screens: IntakeScreenDef<K>[];
};
