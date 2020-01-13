/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
'use strict'

const cluster = require('cluster')
const { Agent, Config } = require('spm-agent')

function getWorkers () {
  return {
    start: function (agent) {
      const timerId = setInterval(function () {
        const now = new Date()
        if (cluster.isMaster || process.env.NODE_APP_INSTANCE === 0 || process.env.SPM_MASTER_MODE === '1' || process.env.STARTUP === 'true') {
          agent.addMetrics({
            timestamp: now,
            measurement: 'nodejs',
            tags: {},
            fields: { workers: Object.keys(cluster.workers || {}).length || 1 }
          })
        }
      }, Config.collectionInterval)
      if (timerId.unref) {
        timerId.unref()
      }
    },
    stop: function () {}
  }
}
module.exports = function () {
  return new Agent(getWorkers())
}
