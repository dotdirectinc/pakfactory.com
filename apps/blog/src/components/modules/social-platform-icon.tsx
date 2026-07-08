import Image from "next/image";
import { Globe } from "lucide-react";
import {
  isSocialPlatform,
  socialPlatformIconSrc,
  socialPlatformTitle,
  type SocialPlatform,
} from "@pakfactory/sanity/social-platforms";

type SocialPlatformIconProps = {
  platform: SocialPlatform | string;
  label?: string;
  size?: number;
  className?: string;
};

export function SocialPlatformIcon({
  platform,
  label,
  size = 20,
  className,
}: SocialPlatformIconProps) {
  if (!isSocialPlatform(platform)) return null;

  const iconSrc = socialPlatformIconSrc(platform);
  const icon = iconSrc ? (
    <Image
      src={iconSrc}
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    />
  ) : platform === "website" ? (
    <Globe
      className="shrink-0 text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    />
  ) : null;

  if (!icon) return null;

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
