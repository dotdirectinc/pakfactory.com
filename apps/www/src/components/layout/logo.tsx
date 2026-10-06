// Source: shadcn-studio (logo)
import Image from 'next/image'



// Util Imports
import { cn } from '@pakfactory/ui/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center', className)}>
      {/* Rendered size (h-8), not the 4338×1031 source — sizes the srcset to ~256/384w instead of 3840w. */}
      <Image
        src="/logo.png"
        alt='PakFactory'
        width={135}
        height={32}
        className='h-8 w-auto'
        priority
      />
    </div>
  )
}

export default Logo
