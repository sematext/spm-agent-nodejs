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
  const { uptime, pid, ppid } = process
  const processInfo = {
    uptime: uptime(),
    pid,
    ppid
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
          name: 'process',
          processType,
          uptime: Math.floor(uptime) || 0,
          value: [ pid, ppid, Math.floor(uptime) || 0 ]
        })
      }, config.collectionInterval)
      if (timerId.unref) {
        timerId.unref()
      }
    },
    stop: function () {}
  }
}
module.exports = function () {
  return new Agent(getProcessStats())
}
