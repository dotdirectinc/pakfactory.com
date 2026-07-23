import type { SVGProps } from "react";

/**
 * Case study meta-card section glyphs (Solution, Packaging Type, Expertise, Customization).
 * Dual-tone brand fills from Figma — not currentColor.
 */
type CaseStudyMetaIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

const NAVY = "#231C4D";
const GREEN = "#63B441";

export function SolutionIcon({
  size = 18,
  className,
  ...props
}: CaseStudyMetaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M9.01847 14.9684H3.18866V14.9306C3.18866 11.6716 5.77148 8.98108 8.98157 8.98108C12.1917 8.98108 14.7745 11.6337 14.7745 14.9306V14.9684H9.01847Z"
        fill={NAVY}
      />
      <path
        d="M9.01845 9.01895H8.98155C5.77147 9.01895 3.18864 6.36632 3.18864 3.06947V3.03158H8.98155H14.7745V3.06947C14.8114 6.32842 12.2285 9.01895 9.01845 9.01895Z"
        fill={GREEN}
      />
    </svg>
  );
}
SolutionIcon.displayName = "SolutionIcon";

export function PackagingTypeIcon({
  size = 18,
  className,
  ...props
}: CaseStudyMetaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M8.98205 2.89346V15.0696C12.249 15.0696 14.9056 12.3392 14.9056 8.98155C14.9415 5.62388 12.2849 2.89346 8.98205 2.89346Z"
        fill={GREEN}
      />
      <path
        d="M8.98205 9.01845C8.98205 5.62388 6.36133 2.89346 3.0585 2.89346V15.0696C6.36133 15.1065 8.98205 12.3761 8.98205 9.01845Z"
        fill={NAVY}
      />
    </svg>
  );
}
PackagingTypeIcon.displayName = "PackagingTypeIcon";

export function ExpertiseIcon({
  size = 18,
  className,
  ...props
}: CaseStudyMetaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <circle cx="6.5" cy="6.5" r="3" fill={NAVY} />
      <circle cx="12.5" cy="12.5" r="3" fill={NAVY} />
      <circle cx="6.5" cy="12.5" r="3" fill={GREEN} />
      <circle cx="12.5" cy="6.5" r="3" fill={GREEN} />
    </svg>
  );
}
ExpertiseIcon.displayName = "ExpertiseIcon";

export function CustomizationIcon({
  size = 18,
  className,
  ...props
}: CaseStudyMetaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <g transform="translate(3.002 2.571)">
        <path
          d="M5.45061 0V12.8588C9.07103 12.8257 11.9955 9.95985 11.9955 6.42938C11.9955 2.89891 9.07103 0.0331001 5.45061 0Z"
          fill={NAVY}
        />
        <path
          d="M2.72525 3.77779C1.2202 3.77779 0 4.9649 0 6.42938C0 7.89386 1.2202 9.08098 2.72525 9.08098C4.2303 9.08098 5.45061 7.89375 5.45061 6.42938C5.45061 4.96501 4.23041 3.77779 2.72525 3.77779Z"
          fill={GREEN}
        />
      </g>
    </svg>
  );
}
CustomizationIcon.displayName = "CustomizationIcon";
