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
const pm2Enabled = /^true/i.test(process.env.PM2)
const infraToken = Config.tokens.infra

const addMetrics = function (agent, pidToCheck) {
  const timestamp = new Date()
  pidUsageTree(pidToCheck, function (err, results) {
    if (err) {
      return console.error(err)
    }

    const processes = Object.keys(results)
      .map(key => results[key])
      .filter(proc => proc)

    const masterProcess = processes.filter(proc => proc.pid === pidToCheck).pop()
    const masterProcessMetric = {
      timestamp: timestamp,
      measurement: 'process',
      tags: {
        token: infraToken,
        'process.name': 'node',
        'process.type': 'master'
      },
      fields: {
        'cpu.usage': masterProcess.cpu,
        rss: masterProcess.memory,
        uptime: masterProcess.elapsed
      }
    }
    agent.addMetrics(masterProcessMetric)
    const childProcesses = processes.filter(proc => proc.pid !== pidToCheck)
    if (childProcesses && childProcesses.length) {
      childProcesses.forEach((proc, counter) => {
        const childProcessMetric = {
          timestamp: timestamp,
          measurement: 'process',
          tags: {
            token: infraToken,
            'process.name': 'node',
            'process.type': 'child'
          },
          fields: {
            'cpu.usage': proc.cpu,
            rss: proc.memory,
            uptime: proc.elapsed
          }
        }
        agent.addMetrics(childProcessMetric)
      })
    }

    const processCountMetric = {
      timestamp: timestamp,
      measurement: 'process',
      tags: {
        token: infraToken,
        'process.type': 'master',
        'process.name': 'node'
      },
      fields: {
        count: 1
      }
    }
    agent.addMetrics(processCountMetric)
    const processChildCountMetric = {
      timestamp: timestamp,
      measurement: 'process',
      tags: {
        token: infraToken,
        'process.type': 'child',
        'process.name': 'node'
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
      this.timerId = setInterval(function () {
        if (pm2Enabled) {
          getPm2Metrics(agent)
        } else {
          getDefaultProcessMetrics(agent)
        }
      }, Config.collectionInterval)
      if (this.timerId.unref) {
        this.timerId.unref()
      }
    },
    stop: function () {
      clearInterval(this.timerId)
    }
  }
}

module.exports = function () {
  const a = getProcessStats()
  return new Agent(a)
}
