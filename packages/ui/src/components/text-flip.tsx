"use client"

import { useEffect, useId, useRef, useState } from "react"

import { motion } from "motion/react"

import { cn } from "@pakfactory/ui/lib/utils"

interface TextFlipProps {
  words: string[]
  interval?: number
  className?: string
  textClassName?: string
  animationDuration?: number
}

const TextFlip = ({
  words,
  interval = 3000,
  className,
  textClassName,
  animationDuration = 700,
}: TextFlipProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [width, setWidth] = useState(100)

  const textRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const updateWidthForWord = () => {
    const el = textRef.current
    if (el) {
      setWidth(el.scrollWidth)
    }
  }

  useEffect(() => {
    updateWidthForWord()
  }, [currentWordIndex])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, interval)

    return () => clearInterval(intervalId)
  }, [words, interval])

  const word = words[currentWordIndex] ?? words[0] ?? ""

  return (
    <motion.div
      layout
      layoutId={`words-here-${id}`}
      animate={{ width }}
      transition={{ duration: animationDuration / 2000 }}
      className={cn("relative inline-block text-start", className)}
      key={word}
    >
      <motion.div
        transition={{
          duration: animationDuration / 1000,
          ease: "easeInOut",
        }}
        className={cn("inline-block", textClassName)}
        ref={textRef}
        layoutId={`word-div-${word}-${id}`}
      >
        <motion.div className="inline-block">
          {word.split("").map((letter, index) => (
            <motion.span
              key={index}
              initial={{
                opacity: 0,
                filter: "blur(10px)",
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
              }}
              transition={{
                delay: index * 0.05,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export { TextFlip, type TextFlipProps }
