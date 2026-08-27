import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';

type AuthFieldProps = {
    name: string;
    label: string;
    type?: string;
    /**
     * Getting this right is not cosmetic: `one-time-code` is what lets iOS and
     * Android offer the code from the email, and `current-password` vs
     * `new-password` is how a password manager knows whether to fill or to offer
     * to generate. Wrong values here are a real drop-off.
     */
    autoComplete: string;
    defaultValue?: string;
    inputMode?: 'text' | 'numeric';
    maxLength?: number;
    hint?: string;
};

export function AuthField({
    name,
    label,
    type = 'text',
    autoComplete,
    defaultValue,
    inputMode,
    maxLength,
    hint,
}: AuthFieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                id={name}
                name={name}
                type={type}
                autoComplete={autoComplete}
                defaultValue={defaultValue}
                inputMode={inputMode}
                maxLength={maxLength}
                required
            />
            {hint ? (
                <p className="text-muted-foreground text-xs">{hint}</p>
            ) : null}
        </div>
    );
}
