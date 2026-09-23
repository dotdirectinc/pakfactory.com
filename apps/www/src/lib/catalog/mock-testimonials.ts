import type {
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';

/**
 * Temporary fixtures so TestimonialsRow / `testimonialsRow` render before
 * shared `testimonial` docs map through.
 */
export const MOCK_PRODUCT_TESTIMONIALS: ProductTestimonial[] = [
    {
        quote: 'PakFactory helped us land a rigid box that feels premium on the shelf and still ships cleanly. The team moved fast from dieline to production samples.',
        attributionName: 'Kaylee Stewart',
        rating: 4,
        positives: ['Professionalism', 'Speed', 'Quality'],
        source: 'google',
    },
    {
        quote: 'Clear communication, solid structural advice, and packaging that matched our brand without endless back-and-forth. We would work with them again.',
        attributionName: 'Lauren Lee',
        rating: 5,
        positives: ['Professionalism', 'Quality', 'Value'],
        source: 'trustpilot',
    },
    {
        quote: 'We needed a custom insert and tight lead time. They flagged risks early and delivered a solution that protected our product and looked intentional.',
        attributionName: 'Marcus Chen',
        rating: 5,
        positives: ['Speed', 'Quality', 'Support'],
        source: 'google',
    },
    {
        quote: 'The quote process was straightforward and the finished boxes exceeded what we expected for a first custom run. Unboxing feedback from customers has been great.',
        attributionName: 'Sofia Ramirez',
        rating: 5,
        positives: ['Quality', 'Value', 'Communication'],
        source: 'google',
    },
    {
        quote: 'Thoughtful recommendations on board and finishes without pushing upsells we did not need. Felt like a true packaging partner.',
        attributionName: 'Jordan Blake',
        rating: 5,
        positives: ['Professionalism', 'Quality', 'Guidance'],
        source: 'trustpilot',
    },
    {
        quote: 'From style selection to quantities, everything stayed organized. Our retail-ready rigid boxes arrived on schedule and print quality was consistent across the lot.',
        attributionName: 'Priya Nair',
        rating: 5,
        positives: ['Speed', 'Quality', 'Reliability'],
        source: 'google',
    },
];

export const MOCK_TESTIMONIALS_AGGREGATE: TestimonialsAggregate = {
    source: 'google',
    label: 'Customer Reviews',
    score: 4.8,
};
