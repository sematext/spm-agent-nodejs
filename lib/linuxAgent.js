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
var config = SpmAgent.Config
var os = require('os')
var cluster = require('cluster')
var LinuxMetrics = require('./linuxMetrics.js')

/**
 * This module generates Linux-OS Metrics. Names are compatible with collectd. SpmSender uses collectd format for OS Metrics
 * @returns {Agent}
 */
module.exports = function () {
  var osAgent = new Agent(
  {
    start: function (agent) {
      this.isLinux = (os.platform() === 'linux')
      var linux = new LinuxMetrics()
      var cpuLastValues = {}
      os.cpus().forEach(function (cpu, i) {
        cpuLastValues[i] = {idle: 0, user: 0, sys: 0, irq: 0, nice: 0, wait: 0, softirq: 0, stolen: 0}
      })
      var cpuProperties = ['user', 'nice', 'irq', 'sys', 'idle']
      if (cluster.isMaster) {
        var timerId = setInterval(function () {
          var time = new Date().getTime()
          var metrics = {}
          metrics['collectd-sys-load'] = os.loadavg()
          metrics['collectd-mem-free'] = os.freemem()
          metrics['collectd-mem-used'] = os.totalmem() - os.freemem()
          if (this.isLinux) {
            linux.vmstat(function (err, vmstat) {
              if (err) {
                SpmAgent.Logger.error('error calling vmstat ' + err)
                return
              }
              metrics['collectd-mem-buff'] = vmstat.buff
              metrics['collectd-mem-cach'] = vmstat.cache
              metrics['collectd-swap-used'] = vmstat.swpd
              metrics['collectd-swap-in'] = vmstat.si
              metrics['collectd-swap-out'] = vmstat.so
              linux.vmstatS(function (err, vmstat) {
                if (err) {
                  SpmAgent.Logger.error('error calling vmstat ' + err)
                  return
                }
                cpuProperties = ['user', 'nice', 'irq', 'sys', 'idle', 'wait', 'softirq', 'stolen']
                var cpuTotal = 0
                // we get summary of all cpu's so in collectd we send cpu-0
                var i = 0
                cpuProperties.forEach(function (property) {
                  cpuLastValues[i][property] = vmstat.cpu [property] - cpuLastValues[i][property]
                  cpuTotal = cpuTotal + cpuLastValues[i][property]
                })
                metrics['collectd-cpu-usr\tcpu-' + i + '/cpu-user'] = (cpuLastValues[i].user / cpuTotal) * 100
                metrics['collectd-cpu-nic\tcpu-' + i + '/cpu-nice'] = (cpuLastValues[i].nice / cpuTotal) * 100
                metrics['collectd-cpu-sys\tcpu-' + i + '/cpu-system'] = (cpuLastValues[i].sys / cpuTotal) * 100
                metrics['collectd-cpu-idl\tcpu-' + i + '/cpu-idle'] = (cpuLastValues[i].idle / cpuTotal) * 100
                metrics['collectd-cpu-int\tcpu-' + i + '/cpu-interrupt'] = (cpuLastValues[i].irq / cpuTotal) * 100
                // We can't get this values from node.js standard API
                metrics['collectd-cpu-ste\tcpu-' + i + '/cpu-steal'] = (cpuLastValues[i].stolen / cpuTotal) * 100
                metrics['collectd-cpu-sir\tcpu-' + i + '/cpu-softirq'] = (cpuLastValues[i].softirq / cpuTotal) * 100
                metrics['collectd-cpu-wait\tcpu-' + i + '/cpu-wait'] = (cpuLastValues[i].wait / cpuTotal) * 100
                // setting "sct" parameter for spm-sender to use specific collectd format when transmitting to receiver.
                for (var x in metrics)
                  agent.addMetrics({ts: time, name: x, value: metrics[x], sct: 'OS'})
                agent.addMetrics({
                  ts: time,
                  name: 'numWorkers',
                  value: Object.keys(cluster.workers).length
                })
              })
            })
          }
        }, config.collectionInterval || 30000)
        if (timerId.unref)
          timerId.unref()
      } else {
        // osmetrics deactivated on worker processes
      }
    }
  }
  )
  return osAgent
}
