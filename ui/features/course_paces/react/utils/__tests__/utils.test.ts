/*
 * Copyright (C) 2022 - present Instructure, Inc.
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

import moment from 'moment-timezone'
import { calculatePaceDuration, calculatePaceItemDuration, calendarDaysToPaceDuration, isTimeToCompleteCalendarDaysValid } from "../utils"
import { PACE_ITEM_1, PACE_ITEM_2, PACE_ITEM_3, PRIMARY_PACE } from '../../__tests__/fixtures'
import { AssignmentWeightening, CoursePaceItem } from '../../types'

describe('utils', () => {
  const startDate = moment('2022-01-01')
  const endDate = moment('2022-01-10')

  const expectedDuration = { weeks: 1, days: 3 }

  describe('calculatePaceDuration', () => {
    it('should calculate the correct pace duration', () => {

      const result = calculatePaceDuration(startDate, endDate)
      expect(result).toEqual(expectedDuration)
    })
  })

  describe('calendarDaysToPaceDuration', () => {
    it('should convert calendar days to pace duration correctly', () => {
      const calendarDays = 10
      const expectedDuration = { weeks: 1, days: 3 }
      const result = calendarDaysToPaceDuration(calendarDays)
      expect(result).toEqual(expectedDuration)
    })
  })

  describe('calculatePaceItemDuration', () => {
    const assignmentWeightedDuration: AssignmentWeightening = {
      assignment: 2,
      discussion: 3,
      quiz: 4,
      page: 1
    }

    const coursePaceItem: CoursePaceItem[] = [
      {
        //assignment
        ...PACE_ITEM_1,
        module_item_type: 'Assignment',
        duration: 6
      },
      {
        //discussion
        ...PACE_ITEM_2,
        module_item_type: 'DiscussionTopic',
        duration: 6
      },
      {
        //quiz
        ...PACE_ITEM_3,
        module_item_type: 'Quizzes::Quiz',
        duration: 6
      },
      {
        //page
        ...PACE_ITEM_3,
        id: '54',
        module_item_type: 'Page',
        duration: 6
      },
    ]

    it('adds the right duration to the right item', () => {
      const result = calculatePaceItemDuration(coursePaceItem, assignmentWeightedDuration)

      expect(result[0].duration).toEqual(assignmentWeightedDuration.assignment)
      expect(result[1].duration).toEqual(assignmentWeightedDuration.discussion)
      expect(result[2].duration).toEqual(assignmentWeightedDuration.quiz)
      expect(result[3].duration).toEqual(assignmentWeightedDuration.page)
    })

    it('adds the right duration (no weighting duration for page)', () => {

      const newWeightedDuration = {
        ...assignmentWeightedDuration,
        page: undefined
      }

      const result = calculatePaceItemDuration(coursePaceItem, newWeightedDuration)

      expect(result[0].duration).toEqual(assignmentWeightedDuration.assignment)
      expect(result[1].duration).toEqual(assignmentWeightedDuration.discussion)
      expect(result[2].duration).toEqual(assignmentWeightedDuration.quiz)
      expect(result[3].duration).toEqual(6)
    })
  })

  describe('isTimeToCompleteCalendarDaysValid', () => {
    const coursePace = {
      ...PRIMARY_PACE,
      exclude_weekends: false,
      start_date: '2021-09-01',
      time_to_complete_calendar_days: 7,
    }

    const coursePaceItem: CoursePaceItem[] = [
      {
        ...PACE_ITEM_1,
        duration: 2,
      },
      {
        ...PACE_ITEM_2,
        duration: 2,
      },
      {
        ...PACE_ITEM_3,
        duration: 2,
      },
    ]

    it('returns true when calendar days are within the time to complete', () => {
      const result = isTimeToCompleteCalendarDaysValid(coursePace, coursePaceItem, [])
      expect(result).toBeTruthy()
    })

    it('returns false when calendar days exceed the time to complete', () => {
      const newCoursePace = {
        ...coursePace,
        time_to_complete_calendar_days: 4,
      }

      const result = isTimeToCompleteCalendarDaysValid(newCoursePace, coursePaceItem, [])
      expect(result).toBeFalsy()
    })

    it('takes into account weekends when exclude_weekends is true', () => {
      window.ENV.FEATURES ||= {}
      window.ENV.FEATURES.course_paces_skip_selected_days = false

      const newCoursePace = {
        ...coursePace,
        exclude_weekends: true,
      }

      const result = isTimeToCompleteCalendarDaysValid(newCoursePace, coursePaceItem, [])
      //Result is false because weekens are not included in paces due dates
      expect(result).toBeFalsy()
    })

    it('takes into account selected days to skip', () => {
      window.ENV.FEATURES ||= {}
      window.ENV.FEATURES.course_paces_skip_selected_days = true

      const newCoursePace = {
        ...coursePace,
        selected_days_to_skip: ['mon', 'tue'],
      }

      const result = isTimeToCompleteCalendarDaysValid(newCoursePace, coursePaceItem, [])
      //Result is false because Mondays and Tuesdays are not included in paces due dates
      expect(result).toBeFalsy()
    })

    it('takes into account blackout dates', () => {
      const blackoutDates = [
        {
          id: '30',
          course_id: PRIMARY_PACE.course_id,
          event_title: 'Spring break',
          start_date: moment('2021-09-02'),
          end_date: moment('2021-09-03'),
        },
      ]

      const result = isTimeToCompleteCalendarDaysValid(coursePace, coursePaceItem, blackoutDates)
      expect(result).toBeFalsy()
    })
  })
})
