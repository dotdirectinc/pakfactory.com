/**
 * Standard newsroom press copy (PROD-2918 review). Studio pre-fills the
 * Newsroom Detail Page template with it, and www falls back to it when a
 * template field is empty — so every release shows both the "About
 * PakFactory" and "Media contact" cards without editor work. One source for
 * both, so the prefill and the fallback cannot drift apart.
 */

export const NEWSROOM_MEDIA_CONTACT_TEXT = 'For media inquiries, email'
export const NEWSROOM_MEDIA_CONTACT_EMAIL = 'press@pakfactory.com'

/** Portable Text (one paragraph; "pakfactory.com" links to the site). */
export const NEWSROOM_ABOUT_TEXT = [
  {
    _type: 'block',
    _key: 'about',
    style: 'normal',
    markDefs: [{_type: 'link', _key: 'site', href: 'https://pakfactory.com'}],
    children: [
      {
        _type: 'span',
        _key: 'about-text',
        marks: [],
        text:
          'Founded in 2015 in Markham, Ontario, PakFactory has spent the past decade helping ' +
          'brands bring their packaging ideas to life. Today, PakFactory partners with more ' +
          'than 5,000 brands across more than 20 industries, guiding each project from ' +
          'strategy and design through prototyping, manufacturing, and logistics. Learn more at ',
      },
      {_type: 'span', _key: 'about-link', marks: ['site'], text: 'pakfactory.com'},
      {_type: 'span', _key: 'about-end', marks: [], text: '.'},
    ],
  },
]
