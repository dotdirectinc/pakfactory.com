// Source: shadcn-studio (hero-section-32/header)
"use client";

import { useEffect, useState } from "react";

import { MenuIcon } from "lucide-react";

import NavDropdown from "@/components/layout/nav-dropdown";
import NavMenu from "@/components/layout/nav-menu";
import type { NavigationSection } from "@/components/layout/nav-menu";
import Logo from "@/components/layout/logo";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";

type HeaderProps = {
  navigationData: NavigationSection[];
  className?: string;
};

const HeroHeader = ({ navigationData, className }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 w-full border-b transition-all duration-300",
        {
          "bg-card/75 backdrop-blur": isScrolled,
        },
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#">
          <Logo className="gap-3" />
        </a>

        <NavMenu
          navigationData={navigationData}
          className="grow max-md:hidden"
        />

        <Button className="rounded-lg max-md:hidden" asChild>
          <a href="#">Login</a>
        </Button>

        <div className="flex gap-4 md:hidden">
          <Button className="rounded-lg" asChild>
            <a href="#">Login</a>
          </Button>

          <NavDropdown
            align="end"
            navigationData={navigationData}
            trigger={
              <Button variant="outline" size="icon" className="lg:hidden">
                <MenuIcon />
                <span className="sr-only">Menu</span>
              </Button>
            }
          />
        </div>
      </div>
    </header>
  );
};

export default HeroHeader;
