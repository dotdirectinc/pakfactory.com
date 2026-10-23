export const CUSTOMIZATION_BUILDER_COPY = {
    title: 'Customize your packaging',
    guidedIntro:
        'Answer one step at a time — or choose “Need consultation” and a specialist will advise.',
    workspaceIntro:
        'Review or change any option. Everything stays editable.',
    stepOf: 'Step {current} of {total}',
    back: 'Back',
    next: 'Next',
    previousOption: 'Previous option',
    nextOption: 'Next option',
    skipNotSure: 'Need consultation',
    /** Detail panel when Need consultation is selected. */
    notSureHelper:
        'A specialist will recommend options when they review your request.',
    /** Shown under the consultation description when the buyer has an assignment. */
    talkToSpecialist: 'Talk to {name}',
    /**
     * Sub-line under the Need consultation option in the type list / print gate.
     * Distinct from {@link specialistToAdvise} (summary value when skipped).
     */
    consultationSubLine:
        "We'll recommend options based on your product.",
    specialistToAdvise: 'Specialist to advise',
    notSet: 'Not set',
    ready: 'Ready',
    close: 'Close',
    save: 'Save',
    length: 'Length',
    width: 'Width',
    height: 'Height',
    unit: 'Unit',
    unitIn: 'in',
    unitMm: 'mm',
    selectOption: 'Select an option',
    navLabel: 'Customization categories',
    typeListLabel: 'Category types',
    /** Middle-panel option filter (selection steps). */
    searchPlaceholder: 'Search {category}…',
    searchNoMatches: 'No matches for this search.',
    searchLabel: 'Search options',
    detailLabel: 'Detail',
    external: 'External',
    internal: 'Internal',
    measurements: 'Measurements',
    pickAnOption: 'Choose an option for this type.',
    chooseOne: 'Choose one',
    chooseAny: 'Choose any',
    unavailableWithSelections: 'Not available with your current selections',
    additionalNote: 'Additional note',
    addAdditionalNote: '+ Add a note',
    removeSelection: 'Remove selection',
    additionalNotePlaceholder:
        'Specific {category} details for your specialist…',
    skip: 'Skip, let a specialist advise',
    /** Guided stacked drawer — short enough to sit beside Next. */
    skipStep: 'Skip this step',
    /** Guided stacked list header. `{label}` is the category name. */
    stepMenu: '{label} · {current} of {total}',
    /** PROD-2629 / ADR-017 — reverse of Sanity `achieves` (candidates, not a recipe). */
    achievedByHelper:
        'This finish can be achieved by these techniques, learn more about them:',
    achievedBySelected: 'Technique',
    achievedByLearnMore: 'Learn more',
    /** Printing-step Printed Side gate (before Method / Color). */
    printOutside: 'Print Outside',
    printInside: 'Print Inside',
    /** `{side}` = Printable Sides value title (Outside, Front Panel, …). */
    printSideLabel: 'Print {side}',
    printedSideYes: 'Yes',
    printedSideNo: 'No',
    /** Pantone Spot / Hybrid option detail controllers. */
    pantoneCountLabel: 'How many Pantone colors?',
    pantoneCountDecrease: 'Fewer Pantone colors',
    pantoneCountIncrease: 'More Pantone colors',
    pantonePmsLabel: 'Pantone (PMS) codes',
    pantonePmsPlaceholder: 'e.g. PMS 185 C',
    pantonePmsRemove: 'Remove Pantone code',
} as const;
