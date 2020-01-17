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
const fs = require('fs')

const getThreadCount = function (processId) {
  // thread count meric
  var threadCount = 0
  if (/linux/i.test(process.platform)) {
    try {
      const pidStatus = String(fs.readFileSync(`/proc/${processId}/status`))
      const threadCountLine = pidStatus.match(/Threads:\s(\d+)/)
      if (threadCountLine && threadCountLine.length > 1) {
        threadCount = Number(threadCountLine[1])
      }
    } catch (err) {
      // console.error(err)
    }
  }
  if (/win/i.test(process.platform)) {
    try {
      const spawnWin = require('child_process').spawnSync
      var child = spawnWin('powershell.exe', ['-Command', 'Get-CimInstance', '-Class Win32_Thread', '-Filter', `ProcessHandle = ${processId}`], {env: process.env})
      var tc = Number(String(child.stdout))
      if (tc) {
        threadCount = tc
      }
    } catch (winErr) {
      console.error(winErr)
    }
  }
  if (/darwin/i.test(process.platform)) {
    try {
      const spawnDarwin = require('child_process').spawnSync
      const child = spawnDarwin('/bin/ps', ['M', `${processId}`], { env: process.env })
      const darwinTc = (String(child.stdout) || '').split('\n').length 
      if (darwinTc > 0) {
        threadCount = darwinTc - 1 // remove headline
      }
    } catch (darwinErr) {
      // console.error(darwinErr)
    }
  }
  return threadCount
}

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
      measurement: 'nodejs.process',
      tags: {
        token: infraToken,
        'nodejs.process.name': 'master',
        'nodejs.process.type': 'master'
      },
      fields: {
        'cpu.percent': masterProcess.cpu,
        memory: masterProcess.memory,
        uptime: masterProcess.elapsed,
        'thread.count': getThreadCount(pidToCheck)
      }
    }
    agent.addMetrics(masterProcessMetric)
    const childProcesses = processes.filter(proc => proc.pid !== pidToCheck)
    if (childProcesses && childProcesses.length) {
      childProcesses.forEach((proc, counter) => {
        const childProcessMetric = {
          timestamp: timestamp,
          measurement: 'nodejs.process',
          tags: {
            token: infraToken,
            'nodejs.process.name': `child-${counter + 1}`,
            'nodejs.process.type': 'child'
          },
          fields: {
            'cpu.percent': proc.cpu,
            memory: proc.memory,
            uptime: proc.elapsed,
            'thread.count': getThreadCount(proc.id)
          }
        }
        agent.addMetrics(childProcessMetric)
      })
    }

    const processCountMetric = {
      timestamp: timestamp,
      measurement: 'nodejs.process',
      tags: {
        token: infraToken,
        'nodejs.process.type': 'master'
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
        token: infraToken,
        'nodejs.process.type': 'child'
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
