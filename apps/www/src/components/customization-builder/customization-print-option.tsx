'use client';

import {OptionDetail} from '@/components/customization-builder/option-detail';
import type {BuilderOption} from '@/lib/customization-builder';

type SelectionDetailProps = {
    option: BuilderOption | undefined;
    consultationSelected?: boolean;
    entryNote: string;
    onEntryNoteChange: (note: string) => void;
};

export function CustomizationPrintOption(props: SelectionDetailProps) {
    return <OptionDetail {...props} />;
}
