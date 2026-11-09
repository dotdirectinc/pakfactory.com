import 'server-only';
import {createClient} from '@pakfactory/supabase/server';

/** Is the visitor signed in? (Supabase.) A failure means no. */
export async function isViewerSignedIn(): Promise<boolean> {
    let signedIn = false;
    try {
        const supabase = await createClient();
        const {data} = await supabase.auth.getUser();
        signedIn = Boolean(data.user);
    } catch {
        signedIn = false;
    }
    return signedIn;
}
