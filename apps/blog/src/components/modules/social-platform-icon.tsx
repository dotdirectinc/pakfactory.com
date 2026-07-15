import type { ComponentType } from "react";
import {
  Facebook,
  Ghost,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import {
  DiscordBrandIcon,
  PinterestBrandIcon,
  XBrandIcon,
} from "@/components/ui/social-brand-icon";
import {
  isSocialPlatform,
  socialPlatformTitle,
  type SocialPlatform,
} from "@pakfactory/sanity/social-platforms";

type SocialPlatformIconProps = {
  platform: SocialPlatform | string;
  label?: string;
  size?: number;
  className?: string;
};

type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  "aria-hidden"?: boolean;
}>;

/**
 * Platform → icon (PROD-2016: shadcn/lucide set). Lucide covers most platforms;
 * X / Pinterest / Discord use official brand paths drawn on the lucide grid
 * (see `ui/social-brand-icon`). All render `currentColor`, so anchors control
 * color and hover states.
 */
const PLATFORM_ICONS: Record<SocialPlatform, IconComponent> = {
  linkedin: Linkedin,
  website: Globe,
  instagram: Instagram,
  x: XBrandIcon,
  pinterest: PinterestBrandIcon,
  snapchat: Ghost,
  discord: DiscordBrandIcon,
  facebook: Facebook,
  youtube: Youtube,
};

export function SocialPlatformIcon({
  platform,
  label,
  size = 20,
  className,
}: SocialPlatformIconProps) {
  if (!isSocialPlatform(platform)) return null;

  const Icon = PLATFORM_ICONS[platform];
  const icon = <Icon size={size} className="shrink-0" aria-hidden />;

  if (label) {
    return (
      <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return <span className={className}>{icon}</span>;
}

export function socialPlatformAriaLabel(
  platform: SocialPlatform | string,
  label?: string,
): string {
  if (label?.trim()) return label.trim();
  return socialPlatformTitle(platform);
}
