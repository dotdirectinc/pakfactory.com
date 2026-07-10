export type PrimaryNavItem = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  /** Set for category-ref items — drives archive active-state matching */
  categorySlug?: string;
};

export type PrimaryNavCta = {
  label: string;
  href: string;
  external: boolean;
};

export type PrimaryNavLogo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type PrimaryNavHeader = {
  logo?: PrimaryNavLogo;
  cta: PrimaryNavCta;
};
