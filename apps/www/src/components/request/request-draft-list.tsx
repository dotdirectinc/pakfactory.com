'use client';

/**
 * Saved draft requests on Your Request.
 * Renders nothing while there are no drafts (no empty-state heading).
 */
export function RequestDraftList() {
    const drafts: {id: string}[] = [];
    if (drafts.length === 0) {
        return null;
    }

    // Draft rows land with the save-draft story.
    return null;
}
