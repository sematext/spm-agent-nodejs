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

// var SpmAgent = require('spm-agent')
var SpmAgent = require('../../spm-agent/lib/index')
var Agent = SpmAgent.Agent
var config = SpmAgent.Config

function getProcessInfo () {
  const { uptime, pid, ppid, send } = process
  const processType = send === undefined ? 'master' : 'child_process'
  const processInfo = {
    uptime: uptime(),
    pid,
    ppid,
    processType
  }
  return processInfo
}

function getProcessStats () {
  return {
    start: function (agent) {
      var timerId = setInterval(function () {
        var now = new Date().getTime()
        var {
          uptime,
          pid,
          ppid,
          processType
        } = getProcessInfo()

        agent.addMetrics({
          ts: now,
          measurement: 'nodejs',
          tags: {
            'nodejs.process.pid': pid,
            'nodejs.process.ppid': ppid,
            'nodejs.process.type': processType
          },
          fields: {
            uptime: Math.floor(uptime) || 0,
            processes: 1
          }
        })
      }, config.collectionInterval)
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