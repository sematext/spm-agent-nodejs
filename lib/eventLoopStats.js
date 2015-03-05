/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */

var util = require("util")
var events = require("events")
var config = require('spm-agent').Config

function EventLoopStats() {
    events.EventEmitter.call(this);
}
util.inherits(EventLoopStats, events.EventEmitter);

EventLoopStats.prototype.start = function() {
  var self = this;
  var measures = [[0, 0]]
  var time = process.hrtime()
  var interval = 200
  this.measureInterval = setInterval(function() {
      measures.push(process.hrtime(time))
      if (measures.length == 2) {
          time = process.hrtime()
          measures[0] = [measures[0][0] - measures[1][0], measures[0][1] - measures[1][1]]
          measures[1] = [0, 0]
      }
  }, interval)

  this.reporterInterval = setInterval(function() {
    var timesInMicroSecs = measures.reduce(function(prev, value, i)
    {
        if (i > 0) {
            var diffInMicroSeconds = (measures[i][0] - measures[i - 1][0]) * 1e9 + (measures[i][1] - measures[i - 1][1])
            var key = Math.floor(diffInMicroSeconds - interval * 1e6)/1e3;
            // this means our timer was executed too early? -> negative delay, lets ignore dr. who phenomena in nodejs
            if (key < 0)
                return prev
            prev[key] = prev[key] || 0
            prev[key]++
        }
        return prev
    }, {})

    var stats = {count: 0, time: 0, avg: 0, min: 1e12, max: 0}
    for(var key in timesInMicroSecs)
    {
        stats.time += parseInt(key, 10) * timesInMicroSecs[key]
        stats.count += timesInMicroSecs[key]
        stats.max = Math.max (parseInt(key, 10), stats.max)
        stats.min = Math.min (parseInt(key, 10), stats.min)
    }
    stats.avg = Math.floor (stats.time / stats.count)
    //console.log (stats)
    self.emit('data', stats)
    measures[0] = measures.pop()
    measures.length = 1
  }, 5 * 1000)

  if (this.measureInterval.unref && this.reporterInterval.unref) {
      this.measureInterval.unref();
      this.reporterInterval.unref();
  }
}

EventLoopStats.prototype.stop = function() {
  if (this.measureInterval && this.reporterInterval) {
      clearInterval(this.measureInterval);
      clearInterval(this.reporterInterval);
  }
}

module.exports = new EventLoopStats();





