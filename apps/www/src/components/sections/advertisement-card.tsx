// Source: shadcn-studio (hero-section-32/widget-advertisement)
"use client";

import Image from "next/image";
import {
  EllipsisVerticalIcon,
  MessageSquareIcon,
  ThumbsUpIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@pakfactory/ui/components/avatar";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader } from "@pakfactory/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pakfactory/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pakfactory/ui/components/tooltip";
import { cn } from "@pakfactory/ui/lib/utils";

const listItems = ["Share", "Update", "Refresh"];

const avatars = [
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png",
    fallback: "OS",
    name: "Olivia Sparks",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png",
    fallback: "HL",
    name: "Howard Lloyd",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png",
    fallback: "HR",
    name: "Hallie Richards",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-16.png",
    fallback: "JW",
    name: "Jenny Wilson",
  },
];

const DEMO_FALLBACK_IMAGE =
  "https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/advertisement.png";

export type AdvertisementCardProps = {
  className?: string;
  bannerUrl?: string | null;
  bannerAlt?: string | null;
  cardTitle?: string;
  cardSubtitle?: string;
  excerpt?: string;
};

const AdvertisementCard = ({
  className,
  bannerUrl,
  bannerAlt,
  cardTitle = "Romeo Juliet drama",
  cardSubtitle = "12 Dec 2025 at 10:00 PM",
  excerpt = "Experience the passionate and tragic love story of Romeo & Juliet like never before.",
}: AdvertisementCardProps) => {
  const hasSanityBanner = Boolean(bannerUrl?.trim());

  return (
    <Card className={cn("justify-between", className)}>
      <CardHeader className="flex justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-[2.625rem] rounded-full">
            <AvatarImage
              src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png"
              alt="Hallie Richards"
              className="rounded-full"
            />
            <AvatarFallback className="text-xs">JW</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-medium">{cardTitle}</span>
            <span className="text-muted-foreground text-sm">
              {cardSubtitle}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-6 rounded-full"
            >
              <EllipsisVerticalIcon />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {listItems.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <div className="flex flex-col gap-9">
        <div className="relative">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
            {hasSanityBanner && bannerUrl ? (
              <Image
                src={bannerUrl}
                alt={bannerAlt?.trim() || cardTitle}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
                priority
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- demo fallback host not in next/image config
              <img
                src={DEMO_FALLBACK_IMAGE}
                alt={bannerAlt?.trim() || "Featured collection"}
                className="aspect-video h-auto w-full object-cover"
              />
            )}
          </div>
          <div className="bg-card absolute -bottom-7 left-[1.375rem] flex flex-col items-center rounded-md px-4 py-2 shadow-xl">
            <span className="text-lg font-medium">12</span>
            <span className="text-muted-foreground">Dec</span>
          </div>
        </div>
        <CardContent className="flex flex-col gap-2">
          <p>{excerpt}</p>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary rounded-sm">
              Romance
            </Badge>
            <Badge className="bg-primary/10 text-primary rounded-sm">
              Drama
            </Badge>
            <Badge className="bg-primary/10 text-primary rounded-sm">
              Funny
            </Badge>
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex-col items-stretch gap-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex -space-x-5 hover:space-x-1">
            {avatars.map((avatar, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Avatar className="ring-background size-12 ring-2 transition-all duration-300 ease-in-out">
                    <AvatarImage src={avatar.src} alt={avatar.name} />
                    <AvatarFallback className="text-xs">
                      {avatar.fallback}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{avatar.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <Button size="sm">Book Now</Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ThumbsUpIcon className="size-4" />
            <span className="text-sm">56k</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquareIcon className="size-4" />
            <span className="text-sm">2k</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default AdvertisementCard;
