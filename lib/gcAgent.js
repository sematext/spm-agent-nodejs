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

var SpmAgent = require('spm-agent')
var Agent = SpmAgent.Agent
// var gcStats = (require('@risingstack/gc-stats'))()
var gcStats = (require('gc-stats'))()

var config = SpmAgent.Config

function getProcessHeapInfo () {
  var pm = process.memoryUsage()
  var metrics = {}
  // metrics.processMemory = [pm.heapUsed, pm.heapTotal, pm.rss]
  metrics.processHeapUsed = pm.heapUsed
  metrics.processHeapTotal = pm.heapTotal
  metrics.processMemoryRss = pm.rss
  return metrics
}

function getGcStats () {
  return {
    start: function (agent) {
      var Measured = require('measured-core')
      var fullGc = new Measured.Counter()
      var incGc = new Measured.Counter()
      var heapCompactions = new Measured.Counter()
      var gcTimes = new Measured.Histogram()
      var heapDiff = new Measured.Histogram()
      var lastHeapInfo = getProcessHeapInfo()
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

      var timerId = setInterval(function () {
        var now = new Date().getTime()
        var heapInfo = lastHeapInfo
        var heapCompactionsJSON = heapCompactions.toJSON()
        // gc.num_gc_inc (int), gc.num_gc_full(int), gc.duration(float), heapCompactionsJSON (int),  gc.heap_diff (float), processHeapUsed (long), processHeapTotal, processMemoryRss (long)
        var metricValues = {
          'gc.inc': incGc.toJSON() || 0,
          'gc.full': fullGc.toJSON() || 0,
          'gc.time': gcTimes.toJSON().sum || 0,
          // heapCompactionsJSON || 0,
          'gc.heap.diff': heapDiff.toJSON().sum || 0,
          'heap.used': heapInfo.processHeapUsed || 0,
          'heap.size': heapInfo.processHeapTotal || 0,
          'memory.rss': heapInfo.processMemoryRss || 0
        }
        agent.addMetrics({ ts: now, measurement: 'nodejs', tags: {}, fields: metricValues })
        fullGc.reset(0)
        incGc.reset(0)
        heapCompactions.reset(0)
        gcTimes.reset()
        heapDiff.reset()
      }, config.collectionInterval)
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
