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

module.exports = function (app) {
  var Agent = require('spm-agent').Agent
  var Measured = require('measured')
  var config = require('spm-agent').Config
  var stats = Measured.createCollection()
  var histogram = new Measured.Histogram()
  var resSize = 0
  var reqSize = 0

  var expressAgent = new Agent(
  {
    start: function (agent) {
      this._agent = agent
      var timerId = setInterval(function () {
        var counter = 0
        var httpStats = stats.toJSON()
        var errRate = httpStats['errRate']
        var responseTimes = histogram.toJSON()
        var now = new Date().getTime()

        // http.requestRate (float), http.errorRate (float), http.3xx (float) , http.4xx (float), http. 5xxRate (float), , reqSize (long), resSize (long), responseTimeMin (float), responseTimeMax(float), responseTime (float)
        var metricValue = [
          httpStats ['requestsPerSecond'] ? httpStats ['requestsPerSecond'].count : 0,  // http.requestRate
          httpStats ['errRate'] ? httpStats ['errRate'].count : 0,                            // http.errorCount (long)
          httpStats ['errRate'] ? httpStats ['errRate'].count : 0,                      // http.errorRate (float)
          httpStats ['3xxRate'] ? httpStats ['3xxRate'].count : 0,                      // http.3xx (float)
          httpStats ['4xxRate'] ? httpStats ['4xxRate'].count : 0,                      // http.4xx (float)
          httpStats ['5xxRate'] ? httpStats ['5xxRate'].count : 0,                      // http.5xx (float)
          reqSize,
          resSize,
          responseTimes.min,
          responseTimes.max,
          responseTimes.sum
        ]

        if (metricValue[0] > 0 || metricValue[1] > 0)
          agent.addMetrics({ts: now, name: 'http', value: metricValue})

        resSize = 0
        reqSize = 0
        stats = Measured.createCollection()
        histogram.reset()
      }, config.collectionInterval)
      if (timerId.unref)
        timerId.unref()
    },
    stop: function () {},
    httpMonitor: function (expressApp) {
      function getContentLength (headerLines) {
        var res = headerLines.match(/content-length:\s(\d*)\r/)
        var rv = 0
        if (res && res.length > 1)
          rv = res [1]
        else
          rv = 0
        return rv
      }
      expressApp.use(function (req, res, next) {
        res._start = new Date().getTime()
        var endOfConnectionHandler = function () {
          var end = new Date().getTime()
          var diff = end - res._start
          stats.meter('requestsPerSecond').mark()
          histogram.update(diff, end)
          if (res._header)
            resSize += (getContentLength(res._header) * 1)
          if (req.headers)
            reqSize += (req.headers['content-length'] || req.headers['Content-Length'] || 0) * 1

          if (res.statusCode >= 300) {
            stats.meter('errRate').mark()
            if (res.statusCode < 400) {
              stats.meter('3xxRate').mark()
            } else if (res.statusCode < 500) {
              stats.meter('4xxRate').mark()
            } else if (res.statusCode >= 500) {
              stats.meter('5xxRate').mark()
            }
          }
        }

        res.on('finish', endOfConnectionHandler)
        res.on('close', endOfConnectionHandler)
        next()
      })

      expressApp.use(function (err, req, res, next) {
        res._start = new Date().getTime()
        var endOfConnectionHandler = function () {
          var end = new Date().getTime()
          var diff = end - res._start
          stats.meter('requestsPerSecond').mark()
          histogram.update(diff, end)
          if (res._header)
            resSize += (getContentLength(res._header) * 1)
          if (req.headers)
            reqSize += (req.headers['content-length'] || req.headers['Content-Length'] || 0) * 1

          if (res.statusCode >= 300) {
            stats.meter('errRate').mark()
            if (res.statusCode < 400) {
              stats.meter('3xxRate').mark()
            } else if (res.statusCode < 500) {
              stats.meter('4xxRate').mark()
            } else if (res.statusCode >= 500) {
              stats.meter('5xxRate').mark()
            }
          }
        }
        res.on('finish', endOfConnectionHandler)
        res.on('close', endOfConnectionHandler)
        next(err)
      })

    }
  })
  return expressAgent

}
