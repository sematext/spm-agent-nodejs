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
const pidUsageTree = require('pidusage-tree')
const addMetrics = function (agent, pidToCheck) {
  const timestamp = new Date()
  pidUsageTree(pidToCheck, function (err, results) {
    if (err) {
      return console.error(err)
    }

    const processes = Object.keys(results)
      .map(key => results[key])
      .filter(proc => proc)

    processes.forEach(proc => {
      let processType = 'child_process'
      if (proc.pid === pidToCheck) {
        processType = 'main_process'
      }
      const processMetric = {
        timestamp: timestamp,
        measurement: 'nodejs.process',
        tags: {
          'nodejs.process.type': processType
        },
        fields: {
          'cpu.percent': proc.cpu,
          memory: proc.memory,
          uptime: proc.elapsed
        }
      }
      agent.addMetrics(processMetric)
    })

    const processCountMetric = {
      timestamp: timestamp,
      measurement: 'nodejs.process',
      tags: {
        'nodejs.process.type': 'main_process'
      },
      fields: {
        count: 1
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
        count: Math.max(processes.length - 1, 0) || 0
      }
    }
    agent.addMetrics(processChildCountMetric)
  })
}

function getDefaultProcessMetrics (agent) {
  if (process.send !== undefined) {
    return // child process, not collecting stats
  }

  addMetrics(agent, process.pid)
}
function getPm2Metrics (agent) {
  if (process.send === undefined) {
    return // master pm2 process, not collecting stats
  }

  addMetrics(agent, process.ppid)
}

function getProcessStats () {
  return {
    start: function (agent) {
      const timerId = setInterval(function () {
        if (
          Boolean(process.env.PM2) === true
        ) {
          getPm2Metrics(agent)
          return
        }
        getDefaultProcessMetrics(agent)
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
