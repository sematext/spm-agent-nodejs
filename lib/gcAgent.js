/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */

"use strict";
var SpmAgent = require('spm-agent')
var Agent = SpmAgent.Agent
var profiler = require('gc-profiler');
var logger = SpmAgent.Logger
var config = SpmAgent.Config

function getProcessHeapInfo() {
    var pm = process.memoryUsage()
    var metrics = {}
    //metrics.processMemory = [pm.heapUsed, pm.heapTotal, pm.rss]
    metrics.processHeapUsed = pm.heapUsed
    metrics.processHeapTotal = pm.heapTotal
    metrics.processMemoryRss = pm.rss
    return metrics
}

function usedHeapDiff(oldHeap, newHeap) {
    if (oldHeap.processHeapUsed && newHeap.processHeapUsed) {
        return newHeap.processHeapUsed - oldHeap.processHeapUsed
    }
    else {
        return 0
    }
}

module.exports = function () {
    var cluster = require('cluster')
    var Measured = require('measured'),
        gcTimes = new Measured.Histogram(),
        heapDiff = new Measured.Histogram()

    var gcAgent = new Agent(
        {
            start: function (agent) {
                var startTime = new Date().getTime()
                var type = 'avg'

                var fullGc = new Measured.Counter();
                var incGc = new Measured.Counter();
                var heapCompactions = new Measured.Counter();
                var lastHeapInfo = {}
                profiler.on('gc', function (info) {
                    var now = new Date().getTime()


                    if (info.type == 'Scavenge') {
                        incGc.inc()
                    } else {
                        fullGc.inc()
                    }

                    if (info.compacted) {
                        heapCompactions.inc()
                        logger.info('gcAgent: heap compaction detected', info)
                    }
                    if (info.duration)
                        gcTimes.update(info.duration)

                    var currentHeapInfo = getProcessHeapInfo()
                    var memoryDiff = usedHeapDiff(lastHeapInfo, currentHeapInfo)
                    lastHeapInfo = currentHeapInfo
                    heapDiff.update(memoryDiff)
                });


                var timerId = setInterval(function () {
                    var now = new Date().getTime()
                    var heapInfo = lastHeapInfo
                    var heap_compactions = heapCompactions.toJSON()
                    // gc.num_gc_inc (int), gc.num_gc_full(int), gc.duration(float), heap_compactions (int),  gc.heap_diff (float), processHeapUsed (long), processHeapTotal, processMemoryRss (long)
                    var metricValues = [
                                   incGc.toJSON(),
                                   fullGc.toJSON() || 0,
                                   gcTimes.toJSON().sum,
                                   heap_compactions || 0,
                                   heapDiff.toJSON().mean || 0,
                                   heapInfo ['processHeapUsed']  ||0,
                                   heapInfo ['processHeapTotal'] ||0,
                                   heapInfo ['processMemoryRss'] ||0,


                    ]

                    agent.addMetrics({ts: now, name: "gc", value: metricValues})
                        incGc.reset(0)
                        fullGc.reset(0)
                        heapCompactions.reset(0)
                        gcTimes.reset()
                        heapDiff.reset()
                    }, config.collectionInterval)
                    if (timerId.unref)
                        timerId.unref()
            },
            stop: function () {}
        }
    )
    return gcAgent;
}
