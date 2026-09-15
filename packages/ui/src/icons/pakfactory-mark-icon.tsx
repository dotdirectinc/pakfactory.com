import type { SVGProps } from "react";

/**
 * PakFactory brand mark (arrow glyph) as inline SVG with `currentColor`.
 * Shared for reuse across www and blog where a mark icon is needed.
 */
type PakFactoryMarkIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

const VIEWBOX_WIDTH = 79;
const VIEWBOX_HEIGHT = 92;

export function PakFactoryMarkIcon({
  size = 16,
  ...props
}: PakFactoryMarkIconProps) {
  const width = size;
  const height =
    typeof size === "number" ? (size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH : "auto";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={width}
      height={height}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M2.13232 19.6036L35.2354 0.568479C36.5546 -0.189493 38.1808 -0.189493 39.5 0.568479L76.8677 22.0545C78.1869 22.8143 79 24.2158 79 25.7335L79 68.7092C79 70.2269 78.1869 71.6302 76.8677 72.3882L43.7646 91.4251C40.9215 93.059 37.3677 91.0157 37.3677 87.7461V49.6758C37.3677 48.1581 36.5546 46.7548 35.2354 45.9968L2.13232 26.9599C-0.710774 25.3259 -0.710774 21.2393 2.13232 19.6036Z" />
    </svg>
  );
}
PakFactoryMarkIcon.displayName = "PakFactoryMarkIcon";
