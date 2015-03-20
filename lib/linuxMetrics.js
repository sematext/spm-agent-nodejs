/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
var exec = require('child_process').exec

function vmstatS (callback) {
  exec('/usr/bin/vmstat -s', function (err, stout, sterr) {
    if (err) {
      callback(err, {})
      return
    }
    var lines = stout.split('\n')
    if (lines.length >= 20) {
      var swapMapping = {
        swapUsed: 7,
        swapIn: 20,
        swapOut: 21
      }
      var memoryMapping = {
        total: 0,
        used: 1,
        active: 2,
        inactive: 3,
        free: 4,
        buffer: 5
      }
      var cpuMapping = {
        nice: 11,
        sys: 12,
        idle: 13,
        wait: 14,
        irq: 15,
        softirq: 16,
        stolen: 17
      }
      var mapValues = function (mapping) {
        var result = {}
        for (var property in mapping) {
          result [property] = lines[mapping[property]].trim().split(' ')[0]
        }
        return result
      }
      var rv = {
        swap: mapValues(swapMapping),
        cpu: mapValues(cpuMapping),
        memory: mapValues(memoryMapping)
      }
      callback(null, rv)
    } else {
      callback(new Error('Error executing vmstat:' + err))
    }
  })
}

function vmstat (callback) {
  exec('/usr/bin/vmstat -s', function (err, stout, sterr) {
    if (err) {
      callback(err, {})
      return
    }
    var lines = stout.split('\n')
    console.log(lines)
    var headers = lines[1].replace(/\s+/g, ' ').split(' ')
    var values = lines[2].replace(/\s+/g, ' ').split(' ')
    console.log(headers.length)
    console.log(values.length)
    var rv = {}
    if (headers.length === values.length) {
      for (var index in headers) {
        rv[headers[index]] = values [index]
      }
      callback(null, rv)
    }
  })
}
module.exports.vmstatS = vmstatS
module.exports.vmstat = vmstat
