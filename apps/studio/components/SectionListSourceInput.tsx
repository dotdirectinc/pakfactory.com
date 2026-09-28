'use client'

import {useCallback} from 'react'
import {set, unset, type StringInputProps} from 'sanity'
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Text,
} from '@sanity/ui'
import {AddIcon, CloseIcon} from '@sanity/icons'

type ListSourceOptions = {
  /** Value when the page/derive chip is active (`page` or `derive`). */
  hostValue?: 'page' | 'derive'
  /** Chip / menu label, e.g. "Page FAQs" or "Derive from source". */
  chipLabel?: string
}

/**
 * Enum string input: Insert page field (or derive) chip vs custom list.
 * Stores `page` | `derive` | `custom`.
 */
export function SectionListSourceInput(props: StringInputProps) {
  const {value, onChange, schemaType} = props
  const options = (schemaType.options ?? {}) as ListSourceOptions
  const hostValue = options.hostValue ?? 'page'
  const chipLabel = options.chipLabel ?? 'Page field'
  const current = typeof value === 'string' ? value : ''
  const isHost = current === hostValue

  const setHost = useCallback(() => {
    onChange(set(hostValue))
  }, [hostValue, onChange])

  const setCustom = useCallback(() => {
    onChange(set('custom'))
  }, [onChange])

  const clear = useCallback(() => {
    onChange(unset())
  }, [onChange])

  return (
    <Stack space={3}>
      <Flex gap={2} align="center" wrap="wrap">
        <MenuButton
          id={`section-list-source-${schemaType.name}`}
          button={
            <Button
              text="Insert page field"
              icon={AddIcon}
              mode="ghost"
              fontSize={1}
              padding={2}
              disabled={isHost}
            />
          }
          menu={
            <Menu>
              <MenuItem text={chipLabel} onClick={setHost} />
            </Menu>
          }
          popover={{portal: true, placement: 'bottom-start'}}
        />
        <Button
          text="Custom list"
          mode="ghost"
          fontSize={1}
          padding={2}
          disabled={current === 'custom'}
          onClick={setCustom}
        />
        <Text muted size={1}>
          Live value from this page.
        </Text>
      </Flex>

      {isHost ? (
        <Card padding={2} radius={2} tone="transparent" border>
          <Flex gap={2} wrap="wrap" align="center">
            <Badge mode="outline" tone="primary" padding={2} fontSize={1}>
              <Flex align="center" gap={2}>
                <Box>{chipLabel}</Box>
                <Button
                  icon={CloseIcon}
                  mode="bleed"
                  padding={1}
                  fontSize={0}
                  aria-label={`Remove ${chipLabel}`}
                  onClick={clear}
                />
              </Flex>
            </Badge>
          </Flex>
        </Card>
      ) : current === 'custom' ? (
        <Text muted size={1}>
          Using a custom list below.
        </Text>
      ) : (
        <Text muted size={1}>
          Choose a page field or a custom list.
        </Text>
      )}
    </Stack>
  )
}
