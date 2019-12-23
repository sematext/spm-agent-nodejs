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
// const { Agent, Config } = require('spm-agent')
const { Agent, Config } = require('../../spm-agent/lib')
const pidusageTree = require('pidusage')
function getPsTreeMetrics (agent, timestamp) {
  if (process.send !== undefined) {
    // child process, not collecting stats
    return
  }
  console.log('process, send:', process.send)
  console.log('NODE_ID', process.env.NODE_UNIQUE_ID)
  pidusageTree(process.pid, function (err, results) {
    if (err) {
      return console.error(err)
    }
    const pids = Object.keys(results)
    for (let i = 0; i < pids.length; i++) {
      let processType = 'child_process'
      if (pids[i] === String(process.pid)) {
        processType = 'main_process'
      }
      const proc = results[pids[i]]
      const processMetric = {
        timestamp: timestamp,
        measurement: 'nodejs.process',
        tags: {
          'nodejs.process.type': processType
        },
        fields: {
          cpuPercent: proc.cpu,
          memory: proc.memory,
          uptime: proc.elapsed
        }
      }
      agent.addMetrics(processMetric)
    }
    const processCountMetric = {
      timestamp: timestamp,
      measurement: 'nodejs.process',
      tags: {
        'nodejs.process.type': 'main_process'
      },
      fields: {
        mainProcessCount: 1
      }
    }
    agent.addMetrics(processCountMetric)
    const processChildCountMetric = {
      timestamp: timestamp,
      measurement: 'nodejs.process',
      tags: {
        'nodejs.process.type': 'child_process'
      },
      fields: {
        childProcessCount: Math.max(pids.length - 1, 0) || 0
      }
    }
    agent.addMetrics(processChildCountMetric)
  })
}

function getProcessStats () {
  return {
    start: function (agent) {
      const timerId = setInterval(function () {
        const timestamp = new Date()
        getPsTreeMetrics(agent, timestamp)
      }, Config.collectionInterval)
      if (timerId.unref) {
        timerId.unref()
      }
    },
    stop: function () { }
  }
}

module.exports = function () {
  return new Agent(getProcessStats())
}
