import { defineField } from 'sanity'
import { SectionTokenStringInput } from '../components/SectionTokenStringInput'
import { dielineBorderFields } from './dieline-border-fields'
import { sectionLinkTargetFields } from './section-link-target-fields'
import { SECTION_GROUPS } from './section-field-groups'

type SectionHeaderFieldsOptions = {
  /**
   * When true (default for www sections), stamp Heading / Layout groups and
   * wire the token chip input on heading + intro. Pass `false` to keep a flat
   * field list (e.g. if a caller needs the old single-bucket shape).
   */
  withSectionGroups?: boolean
  /** Rows for the intro textarea. Defaults to 2. */
  introRows?: number
  /** Label for the section CTA link object. Defaults to "Section link". */
  linkTitle?: string
}

const TOKEN_HELP =
  'Use Insert page field or type %h1%, %slug%, etc.'

const LINK_QUERY_HELP = 'No leading ?. Example: industry=%slug%'

/**
 * Shared section chrome — Foundations (PROD-2286 / ADR-020).
 *
 * heading · intro · link → Heading tab
 * align · dieline borders → Layout tab (D35 exceptions)
 * Theme, columns, and band styling stay in React.
 */
export function sectionHeaderFields({
  withSectionGroups = true,
  introRows = 2,
  linkTitle = 'Section link',
}: SectionHeaderFieldsOptions = {}) {
  const headingGroup = withSectionGroups ? SECTION_GROUPS.heading : undefined
  const layoutGroup = withSectionGroups ? SECTION_GROUPS.layout : undefined

  const withGroup =
    (group: string | undefined) =>
    <T extends Record<string, unknown>>(field: T): T =>
      group ? ({...field, group} as T) : field

  const borderFields = dielineBorderFields().map((field) =>
    withGroup(layoutGroup)(field as Record<string, unknown>),
  )

  return [
    defineField(
      withGroup(headingGroup)({
        name: 'heading',
        title: 'Heading',
        type: 'string',
        description: `Section title shown above the content. ${TOKEN_HELP}`,
        components: {input: SectionTokenStringInput},
      }),
    ),
    defineField(
      withGroup(headingGroup)({
        name: 'intro',
        title: 'Intro',
        type: 'text',
        rows: introRows,
        description: `Optional line under the heading. Leave blank for none. ${TOKEN_HELP}`,
        components: {input: SectionTokenStringInput},
      }),
    ),
    defineField(
      withGroup(headingGroup)({
        name: 'link',
        title: linkTitle,
        type: 'object',
        description: 'Optional CTA beside or under the heading.',
        fields: [
          defineField({
            name: 'label',
            title: 'Button label',
            type: 'string',
            description: 'Defaults to Learn more when empty.',
          }),
          ...sectionLinkTargetFields(),
          defineField({
            name: 'query',
            title: 'Query',
            type: 'string',
            description: LINK_QUERY_HELP,
            components: {input: SectionTokenStringInput},
          }),
        ],
      }),
    ),
    defineField(
      withGroup(layoutGroup)({
        name: 'align',
        title: 'Alignment',
        type: 'string',
        description: 'Horizontal alignment of the section heading and intro.',
        initialValue: 'left',
        options: {
          list: [
            {title: 'Left', value: 'left'},
            {title: 'Center', value: 'center'},
          ],
          layout: 'radio' as const,
        },
      }),
    ),
    ...borderFields,
  ]
}
