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

const { Agent, Config } = require('spm-agent')
const gcStats = (require('gc-stats'))()

function getProcessHeapInfo () {
  const pm = process.memoryUsage()
  const metrics = {}
  metrics.processHeapUsed = pm.heapUsed
  metrics.processHeapTotal = pm.heapTotal
  metrics.processMemoryRss = pm.rss
  return metrics
}

function getGcStats () {
  return {
    start: function (agent) {
      const Measured = require('measured-core')
      const fullGc = new Measured.Counter()
      const incGc = new Measured.Counter()
      const heapCompactions = new Measured.Counter()
      const gcTimes = new Measured.Histogram()
      const heapDiff = new Measured.Histogram()
      let lastHeapInfo = getProcessHeapInfo()
      gcStats.on('stats', function (info) {
        if (info.gctype === 1) {
          incGc.inc()
        }
        if (info.gctype === 2) {
          fullGc.inc()
        }
        if (info.gctype === 3) {
          incGc.inc()
          fullGc.inc()
        }
        if (info.pause) {
          gcTimes.update(info.pauseMS)
        }
        lastHeapInfo = getProcessHeapInfo()
        heapDiff.update(info.diff.usedHeapSize * -1)
      })

      const timerId = setInterval(function () {
        const heapInfo = lastHeapInfo
        const heapCompactionsJSON = heapCompactions.toJSON()
        const metricValues = {
          'gc.inc': incGc.toJSON() || 0,
          'gc.full': fullGc.toJSON() || 0,
          'gc.time': gcTimes.toJSON().sum || 0,
          'gc.heap.compactions': heapCompactionsJSON || 0,
          'gc.heap.diff': heapDiff.toJSON().sum || 0,
          'heap.used': heapInfo.processHeapUsed || 0,
          'heap.size': heapInfo.processHeapTotal || 0,
          'memory.rss': heapInfo.processMemoryRss || 0
        }
        agent.addMetrics({timestamp: new Date(), measurement: 'nodejs', tags: {}, fields: metricValues })
        fullGc.reset(0)
        incGc.reset(0)
        heapCompactions.reset(0)
        gcTimes.reset()
        heapDiff.reset()
      }, Config.collectionInterval)
      if (timerId.unref) {
        timerId.unref()
      }
    },
    stop: function () {}
  }
}
module.exports = function () {
  return new Agent(getGcStats())
}
