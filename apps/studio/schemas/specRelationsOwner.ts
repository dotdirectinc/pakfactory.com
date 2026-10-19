import { defineField, defineType } from 'sanity'

/**
 * The marker Studio reads to know who owns the catalog relations in this dataset (PROD-2988 /
 * PROD-3008). Written ONLY by the server when an admin flips the switch in the admin office; read-only
 * here, not creatable, no document actions, hidden from search. See lib/spec-owned.ts.
 */
export default defineType({
  name: 'specRelationsOwner',
  title: 'Relations owner (Spec System switch)',
  type: 'document',
  readOnly: true,
  __experimental_omnisearch_visibility: false,
  fields: [
    defineField({ name: 'rules', title: 'Customization rules owned by', type: 'string', options: { list: ['spec', 'studio'] } }),
    defineField({ name: 'structure', title: 'Parents owned by', type: 'string', options: { list: ['spec', 'studio'] } }),
    defineField({ name: 'updatedAt', title: 'Changed at', type: 'datetime' }),
    defineField({ name: 'updatedBy', title: 'Changed by', type: 'string' }),
  ],
  preview: {
    select: { rules: 'rules', structure: 'structure', updatedBy: 'updatedBy' },
    prepare: ({ rules, structure, updatedBy }) => ({
      title: 'Relations owner',
      subtitle: `rules: ${rules ?? 'studio'} · parents: ${structure ?? 'studio'}${updatedBy ? ` · ${updatedBy}` : ''}`,
    }),
  },
})
