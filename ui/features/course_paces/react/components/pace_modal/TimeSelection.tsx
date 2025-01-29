/*
 * Copyright (C) 2025 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState, SetStateAction, Dispatch, useMemo, useCallback } from 'react'
import { connect } from 'react-redux'
import { Flex } from '@instructure/ui-flex'
import CanvasDateInput from '@canvas/datetime/react/components/DateInput'
import { coursePaceTimezone } from '../../shared/api/backend_serializer'
import * as tz from '@instructure/moment-utils'
import { useScope as createI18nScope } from '@canvas/i18n'
import { Text } from '@instructure/ui-text'
import { NumberInput } from '@instructure/ui-number-input'
import { View } from '@instructure/ui-view'
import moment from 'moment-timezone'
import type { CoursePace, OptionalDate, Pace, PaceDuration, ResponsiveSizes, StoreState } from '../../types'
import { generateDatesCaptions, rawDaysBetweenInclusive } from '../../utils/date_stuff/date_helpers'
import { coursePaceActions } from '../../actions/course_paces'
import { calendarDaysToPaceDuration } from '../../utils/utils'
import { getPaceDuration } from '../../reducers/course_paces'

const I18n = createI18nScope('acceptable_use_policy')

const GAP_WIDTH = 'medium'

interface PassedProps {
  readonly coursePace: CoursePace
  readonly appliedPace: Pace
  readonly responsiveSize: ResponsiveSizes
}

interface StoreProps {
  readonly paceDuration: PaceDuration
}

interface DispatchProps {
  readonly setTimeToCompleteCalendarDays: typeof coursePaceActions.setTimeToCompleteCalendarDays
}

interface DateInputWithCaptionProps {
  date: OptionalDate
  setStateDate: Dispatch<SetStateAction<OptionalDate>>
  caption: string
  renderLabel: string
  dataTestId: string
}

interface NumberInputWithLabelProps {
  value: number
  label: string
  renderLabel: string
  unit: 'weeks' | 'days'
  dataTestId: string
}

type TimeSelectionProps = PassedProps & StoreProps & DispatchProps

const TimeSelection = (props: TimeSelectionProps) => {
  const {
    coursePace,
    appliedPace,
    setTimeToCompleteCalendarDays,
    responsiveSize,
  } = props

  const endDateValue = useMemo(() => () => {
    if (coursePace.end_date)
      return coursePace.end_date

    const startDateMoment = moment(coursePace.start_date).startOf('day')

    return startDateMoment.add(coursePace.time_to_complete_calendar_days - 1, 'days').startOf('day').toISOString()
  }, [coursePace])

  const originalPaceDuration = calendarDaysToPaceDuration(coursePace.time_to_complete_calendar_days)

  const [startDate, setStartDate] = useState<OptionalDate>(coursePace.start_date)
  const [endDate, setEndDate] = useState<OptionalDate>(endDateValue)
  const [weeks, setWeeks] = useState<number>(originalPaceDuration.weeks || 0)
  const [days, setDays] = useState<number>(originalPaceDuration.days || 0)

  const dateColumnWidth = responsiveSize === "small" ? "100%" : "15.313rem"

  const formatDate = (date: Date) => {
    return tz.format(date, 'date.formats.long') || ''
  }

  const enrollmentType = coursePace.context_type === 'Enrollment'

  const setTimeToComplete = useCallback(() => {
    const startDateValue = moment(startDate).endOf('day')
    const endDateValue = moment(endDate).endOf('day')

    const calendarDays = rawDaysBetweenInclusive(startDateValue, endDateValue)
    setTimeToCompleteCalendarDays(calendarDays)

    const paceDuration = calendarDaysToPaceDuration(calendarDays)
    setWeeks(paceDuration.weeks)
    setDays(paceDuration.days)
  }, [startDate, endDate, setTimeToCompleteCalendarDays])

  useEffect(() => {
    setTimeToComplete();
  }, [startDate, endDate, setTimeToComplete]);

  const captions = generateDatesCaptions(coursePace, startDate, endDate, appliedPace)

  const DateInputWithCaption = ({ date, setStateDate, caption, renderLabel, dataTestId }: DateInputWithCaptionProps) => {
    const onChangeDate = (date: Date | null) => {
      const dateValue = date ? date.toISOString() : ''
      setStateDate(dateValue)
    }

    return (
      <DateInputContainer caption={caption}>
        <CanvasDateInput
          renderLabel={renderLabel}
          timezone={coursePaceTimezone}
          formatDate={formatDate}
          selectedDate={date}
          onSelectedDateChange={onChangeDate}
          width={dateColumnWidth}
          display="block"
          withRunningValue={true}
          interaction={undefined}
          dataTestid={dataTestId}
        />
      </DateInputContainer>
    )
  }

  const ReadOnlyDateWithCaption = ({ dateValue, caption, dataTestId }: { dateValue: OptionalDate, caption: string, dataTestId: string }) => {
    return (
      <LabeledComponent label={I18n.t('Start Date')}>
        <DateInputContainer caption={caption}>
          <View display='inline-block' height='2.406rem' padding="x-small 0 0 x-small">
            <Text data-testid={dataTestId}>{formatDate(moment.tz(dateValue, coursePaceTimezone).toDate())}</Text>
          </View>
        </DateInputContainer>
      </LabeledComponent>
    )
  }

  const LabeledComponent = ({ label, children }: { label: string, children: React.ReactNode }) => {
    return (
      <Flex direction="column">
        <Flex.Item>
          <Text weight="bold">{label}</Text>
        </Flex.Item>
        <Flex gap="small" direction={responsiveSize === "small" ? "column" : "row"} padding="x-small 0 0 0">
          {children}
        </Flex>
      </Flex>
    )
  }

  const DateInputContainer = ({ children, caption }: { children: React.ReactNode, caption: string }) => {
    return (
      <Flex.Item width={dateColumnWidth} padding="xxx-small 0 0 0">
        {children}
        <View margin="small 0 0 0" display="inline-block">
          <div style={{ whiteSpace: 'nowrap' }}>
            <Text size='small'>{caption}</Text>
          </div>
        </View>
      </Flex.Item>
    )
  }

  const NumberInputWithLabel = ({ value, label, renderLabel, unit, dataTestId }: NumberInputWithLabelProps) => {

    const updateEndDate = (operation: 'add' | 'subtract') => {
      if (!Number.isInteger(value) || value <= 0 && operation === 'subtract') return

      const newEndDate = (operation === 'add')
        ? moment(endDate).add(1, unit)
        : moment(endDate).subtract(1, unit)

      setEndDate(newEndDate.toISOString(true))
    }

    const onIncrement = () => {
      updateEndDate('add')
    }
    const onDecrement = () => {
      updateEndDate('subtract')
    }

    return (
      <Flex.Item>
        <NumberInput
          renderLabel={renderLabel}
          display={'inline-block'}
          width={responsiveSize === "small" ? "14.313rem" : "5.313rem"}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          placeholder={label}
          showArrows={true}
          value={value}
          data-testid={dataTestId}
        />
        <View margin="none none none small">
          <Text>{label}</Text>
        </View>
      </Flex.Item>
    )
  }

  return (
    <View>
      <Flex
        data-testid="time-selection-section"
        gap={GAP_WIDTH}
        direction={responsiveSize === "small" ? "column" : "row"}
        margin="0 0 medium"
        padding="x-small 0 0 xx-small"
        alignItems="start">

        {enrollmentType
          ?
          <ReadOnlyDateWithCaption dateValue={startDate} caption={captions.startDate} dataTestId='start-date-readonly' />
          :
          <DateInputWithCaption
            key={`start-date`}
            date={startDate}
            setStateDate={setStartDate}
            caption={captions.startDate}
            renderLabel={I18n.t('Start Date')}
            dataTestId='start-date-input' />
        }
        <DateInputWithCaption
          key={`end-date`}
          date={endDate}
          setStateDate={setEndDate}
          caption={captions.endDate}
          renderLabel={I18n.t('End Date')}
          dataTestId='end-date-input' />
        <Flex.Item>
          <LabeledComponent label={I18n.t('Time to Complete Course')}>
            <NumberInputWithLabel
              value={weeks}
              label="Weeks"
              renderLabel=''
              unit='weeks'
              dataTestId='weeks-number-input' />
            <NumberInputWithLabel
              value={days}
              label="Days"
              renderLabel=''
              unit='days'
              dataTestId='days-number-input' />
          </LabeledComponent>
        </Flex.Item>
      </Flex>
    </View>
  )
}

const mapStateToProps = (state: StoreState): StoreProps => {
  return {
    paceDuration: getPaceDuration(state),
  }
}

export default connect(mapStateToProps, {
  setTimeToCompleteCalendarDays: coursePaceActions.setTimeToCompleteCalendarDays
})(TimeSelection)
