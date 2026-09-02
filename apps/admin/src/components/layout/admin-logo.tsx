import Image from "next/image";
import { cn } from "@pakfactory/ui/lib/utils";

export function AdminLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/logo.png"
        alt="PakFactory"
        width={4338}
        height={1031}
        className="h-8 w-auto"
        priority
      />
    </div>
  );
}
