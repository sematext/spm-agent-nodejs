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
var Agent = require('spm-agent').Agent
var monitor = require('./eventLoopStats.js')

module.exports = function () {
  var elAgent = new Agent(
    {
      start: function (agent) {
        this.elListener = function (stats) {
          var metric = {
            ts: new Date().getTime(),
            name: 'eventloop',
            value: [stats.count, stats.time, stats.min, stats.max, stats.avg]
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
