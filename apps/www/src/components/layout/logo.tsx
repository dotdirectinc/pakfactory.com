// Source: shadcn-studio (logo)
import Image from 'next/image'



// Util Imports
import { cn } from '@pakfactory/ui/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/logo.png"
        alt='PakFactory'
        width={4338}
        height={1031}
        className='h-8 w-auto'
        priority
      />
    </div>
  )
}

export default Logo
