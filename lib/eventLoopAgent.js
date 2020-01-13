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
const { Agent } = require('spm-agent')
const monitor = require('./eventLoopStats.js')

module.exports = function () {
  const elAgent = new Agent(
    {
      start: function (agent) {
        this.elListener = function (stats) {
          const metric = {
            timestamp: new Date(),
            measurement: 'nodejs.eventloop',
            tags: {},
            fields: {
              count: stats.count,
              'latency.min': stats.min,
              'latency.max': stats.max,
              'latency.max.avg': stats.avg
            }
          }
          agent.addMetrics(metric)
        }
        monitor.on('data', this.elListener)
        monitor.start()
      },
      stop: function () {
        monitor.removeListener('data', this.elListener)
      }
    }
  )
  return elAgent
}
