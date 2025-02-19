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

import React from 'react'
import {useParams} from 'react-router-dom'
import {Portal} from '@instructure/ui-portal'
import NotificationSettings from './notification_settings'
import FeatureFlags from '@canvas/feature-flags'
import AlertListEntryPoint from '@canvas/student-alerts/react/AlertListEntryPoint'

type PortalMount = {
  mountPoint: HTMLElement
  component: JSX.Element
}

// This is set up so it can be used to render multiple portals across the
// entire settings page settings page React code! Just repeat the pattern
// for each tab or bundle you want to render.

// notifications tab
function notificationsTab(portals: PortalMount[], accountId?: string): void {
  const mountPoint = document.getElementById('tab-notifications')
  if (!mountPoint) return
  const data = JSON.parse(mountPoint.dataset.values ?? '{}')
  portals.push({
    mountPoint,
    component: (
      <NotificationSettings
        externalWarning={data.externalWarning}
        customNameOption={data.customNameOption}
        customName={data.customName}
        defaultName={data.defaultName}
        accountId={accountId!}
      />
    ),
  })
}

// Feature Flags tab
function featureFlagsTab(portals: PortalMount[]): void {
  const mountPoint = document.getElementById('tab-features')
  if (!mountPoint) return
  portals.push({
    mountPoint,
    component: <FeatureFlags disableDefaults={undefined} hiddenFlags={undefined} />,
  })
}

// Alerts tab
function alertsTab(portals: PortalMount[]): void {
  const mountPoint = document.getElementById('alerts_mount_point')
  if (!mountPoint) return
  const component = AlertListEntryPoint()
  if (component) portals.push({mountPoint, component})
}

export function Component(): JSX.Element | null {
  const params = useParams()
  const portals: Array<PortalMount> = []

  notificationsTab(portals, params.accountId)
  featureFlagsTab(portals)
  alertsTab(portals)

  return (
    <>
      {portals.map(({mountPoint, component}) => (
        <Portal key={mountPoint.id} open={true} mountNode={mountPoint}>
          {component}
        </Portal>
      ))}
    </>
  )
}
