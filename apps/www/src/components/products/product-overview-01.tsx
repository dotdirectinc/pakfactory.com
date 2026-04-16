// Source: shadcn-studio (product-overview-01)
'use client'

import { useId, useEffect, useState } from 'react'

import { StarIcon, ShoppingCartIcon, HeartIcon, TruckIcon, RefreshCcwIcon } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@pakfactory/ui/components/breadcrumb'
import { Button } from '@pakfactory/ui/components/button'
import { Separator } from '@pakfactory/ui/components/separator'
import { Badge } from '@pakfactory/ui/components/badge'
import { RadioGroup, RadioGroupItem } from '@pakfactory/ui/components/radio-group'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@pakfactory/ui/components/carousel'

import { cn } from '@pakfactory/ui/lib/utils'

type ProductOverviewProps = {
  productItems: {
    name: string
    description: string
    totalReview: number
    rating: number
    price: number
    hasDiscount?: boolean
    discountPercentage?: number
    images: Array<{
      src: string
      alt: string
    }>
    breadcrumbData: Array<{
      label: string
      href?: string
    }>
    defaultSize?: string
    defaultColorOption?: string
  }[]
  sizesChart: {
    value: string
    label: string
    disabled?: boolean
  }[]
  colorsChart: {
    value: string
    colorOption: string
    disabled?: boolean
  }[]
}

const ProductOverview = ({ productItems, colorsChart, sizesChart }: ProductOverviewProps) => {
  const id = useId()

  const [selectedImage, setSelectedImage] = useState(0)
  const [api, setApi] = useState<CarouselApi>()

  useEffect(() => {
    if (!api) return
    api.scrollTo(selectedImage)
  }, [api, selectedImage])

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setSelectedImage(api.selectedScrollSnap())
    }

    api.on('select', onSelect)
    onSelect()

    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {productItems.map(item => {
          const originalPrice = item.price
          const discountPercentage = item.discountPercentage || 0
          const hasDiscount = item.hasDiscount && discountPercentage > 0
          const finalPrice = hasDiscount ? originalPrice - (originalPrice * discountPercentage) / 100 : originalPrice

          return (
            <div key={item.name} className='grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-8 xl:gap-24'>
              {/* Left Side - Image Carousel */}
              <div className='flex flex-col gap-6'>
                <div>
                  <Carousel
                    className='w-full'
                    setApi={setApi}
                    opts={{ align: 'start', loop: true }}
                  >
                    <CarouselContent>
                      {item.images.map((image, index) => (
                        <CarouselItem key={`${image.alt}-${index}`}>
                          <div className='h-142 overflow-hidden rounded-md bg-gray-100'>
                            <img src={image.src} alt={image.alt} className='h-full w-full object-cover' />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>

                <div className='flex justify-between gap-6'>
                  {item.images.map((image, index) => (
                    <button
                      key={index}
                      type='button'
                      onClick={() => setSelectedImage(index)}
                      className='cursor-pointer overflow-hidden rounded-md transition-all duration-200'
                    >
                      <img src={image.src} alt={image.alt} className='h-31 w-full object-cover' />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Side - Product Details */}
              <div className='space-y-6 py-5'>
                <Breadcrumb>
                  <BreadcrumbList>
                    {item.breadcrumbData.map((breadcrumb, index) => (
                      <div key={`${breadcrumb.label}-${index}`} className='flex items-center gap-2.5'>
                        <BreadcrumbItem>
                          {index === item.breadcrumbData.length - 1 ? (
                            <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={breadcrumb.href || '#'}>{breadcrumb.label}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {index < item.breadcrumbData.length - 1 && (
                          <BreadcrumbSeparator key={`${breadcrumb.label}-sep`} />
                        )}
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>

                <h1 className='text-3xl font-semibold'>{item.name}</h1>

                <div className='flex w-fit items-center rounded-sm border px-2.5 py-1.5'>
                  <span className='me-2.5 flex items-center gap-1 border-e pe-2.5 text-sm'>
                    <span className='text-lg font-medium'>{item.rating}</span>
                    <StarIcon className='mb-0.5 size-4 fill-amber-500 stroke-transparent' />
                  </span>
                  <span className='text-muted-foreground'>{item.totalReview} Reviews</span>
                </div>

                {!hasDiscount ? (
                  <h4 className='text-3xl font-bold'>${finalPrice.toFixed(2)}</h4>
                ) : (
                  <div className='flex items-center gap-3'>
                    <h4 className='text-3xl font-bold'>${finalPrice.toFixed(2)}</h4>
                    <span className='text-muted-foreground font-medium line-through'>
                      MRP ${originalPrice.toFixed(2)}
                    </span>
                    <Badge className='border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5'>
                      {discountPercentage}% Off
                    </Badge>
                  </div>
                )}

                <p className='text-muted-foreground'>{item.description}</p>
                <Separator />

                {colorsChart.length > 0 && (
                  <div className='flex items-center gap-6'>
                    <h4 className='text-lg font-semibold'>Color :</h4>
                    <RadioGroup className='flex' defaultValue={item.defaultColorOption}>
                      {colorsChart.map(colorItem => (
                        <label
                          key={`${id}-${colorItem.value}`}
                          className={cn(
                            'has-focus-visible:ring-ring/50 relative size-5 cursor-pointer rounded-full text-center shadow-xs transition-[color,box-shadow] outline-none has-focus-visible:ring-[3px] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50',
                            colorItem.colorOption
                          )}
                        >
                          <RadioGroupItem
                            id={`${id}-${colorItem.value}`}
                            value={colorItem.value}
                            className='sr-only after:absolute after:inset-0'
                            aria-label={`color-radio-${colorItem.value}`}
                            disabled={colorItem.disabled}
                          />
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {sizesChart.length > 0 && (
                  <div className='flex items-center gap-6'>
                    <h4 className='text-lg font-semibold'>Size :</h4>
                    <RadioGroup className='flex' defaultValue={item.defaultSize}>
                      {sizesChart.map(sizeItem => (
                        <label
                          key={`${id}-${sizeItem.value}`}
                          className='border-input group has-data-[state=checked]:bg-primary has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative flex cursor-pointer flex-col items-center gap-3 rounded-md border px-3 py-1.5 text-center shadow-xs transition-[color,box-shadow] outline-none has-focus-visible:ring-[3px] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50'
                        >
                          <RadioGroupItem
                            id={`${id}-${sizeItem.value}`}
                            value={sizeItem.value}
                            className='sr-only after:absolute after:inset-0'
                            aria-label={`size-radio-${sizeItem.value}`}
                            disabled={sizeItem.disabled}
                          />
                          <p className='text-foreground group-has-data-[state=checked]:text-primary-foreground text-sm leading-none font-medium'>
                            {sizeItem.label}
                          </p>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                <div className='flex gap-6'>
                  <Button size='lg' className='grow'>
                    <ShoppingCartIcon />
                    Add to Cart
                  </Button>
                  <Button size='lg' variant='secondary' className='grow'>
                    <HeartIcon />
                    Wish List
                  </Button>
                </div>
                <Separator />

                <div className='rounded-md border *:not-last:border-b'>
                  <div className='flex items-center gap-6 px-6 py-4'>
                    <TruckIcon className='size-7' />
                    <div className='flex flex-col gap-1'>
                      <p className='text-lg font-semibold'>Free Delivery</p>
                      <p className='text-muted-foreground'>Enter your postal code for delivery availability</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-6 px-6 py-4'>
                    <RefreshCcwIcon className='size-7' />
                    <div className='flex flex-col gap-1'>
                      <p className='text-lg font-semibold'>Return Delivery</p>
                      <p>
                        <span className='text-muted-foreground'>Free 30 Days Delivery Returns.</span>{' '}
                        <a href='#' className='underline'>Details</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ProductOverview
