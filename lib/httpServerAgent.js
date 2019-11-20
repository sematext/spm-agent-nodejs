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

/**
 * HttpServerAgent - wraping createServer to add instrumentation
 *
 */

var http = require('http')
var https = require('https')
var cluster = require('cluster')

// constants
var FINISH_EVENT_NAME = 'finish'
var ABRUPT_CLOSE_EVENT_NAME = 'close'

module.exports = function httpServerAgent () {
  var SpmAgent = require('spm-agent')
  var Agent = SpmAgent.Agent
  var config = SpmAgent.Config
  var logger = SpmAgent.Logger
  var Measured = require('measured-core')
  var histogram = new Measured.Histogram()
  var timer = new Measured.Timer()

  // setup context for monitoring
  var ctx = {
    reqSize: 0,
    resSize: 0,
    timer: timer,
    logger: logger,
    histogram: histogram,
    stats: Measured.createCollection()
  }

  // bind monitorHttp safely
  var monitor = safeProcess(ctx, monitorHttp)

  // setup monitoring agent
  var hAgent = new Agent({
    start: function (agent) {
      this._agent = agent
      patchHttpServer(monitor)
      patchHttpsServer(monitor)
      var timerId = setInterval(function () {
        var stats = ctx.stats
        var httpStats = stats.toJSON()
        var responseTimes = histogram.toJSON()
        var now = Date.now()
        var metricValue = {
          requests: httpStats.requests ? httpStats.requests.count : 0, // http.requestCount (int)
          errors: httpStats.errRate ? httpStats.errRate.count : 0, // http.errorCount (int)
          'errors.3xx': httpStats['3xxRate'] ? httpStats['3xxRate'].count : 0, // http.3xx (int)
          'errors.4xx': httpStats['4xxRate'] ? httpStats['4xxRate'].count : 0, // http.4xx (int)
          'errors.5xx': httpStats['5xxRate'] ? httpStats['5xxRate'].count : 0, // http.5xx (int)
          'requests.size.total': ctx.reqSize,
          'responses.size.total': ctx.resSize,
          'responses.time.min': responseTimes.min,
          'responses.time.max': responseTimes.max,
          'responses.time': responseTimes.sum
        }

        if (metricValue.requests > 0 || metricValue.errors > 0) {
          agent.addMetrics({ ts: now, measurement: 'nodejs', tags: {}, fields: metricValue })
        }

        // cleanup aggregate stats
        stats.end()

        // create & reset new metrics
        ctx.stats = Measured.createCollection()
        histogram.reset()
        timer.reset()
        ctx.reqSize = 0
        ctx.resSize = 0

        // track if this is the main process
        if (cluster.isMaster || process.env.NODE_APP_INSTANCE === 0 || process.env.SPM_MASTER_MODE === '1' || process.env.STARTUP === 'true') {
          agent.addMetrics({
            ts: now,
            measurement: 'nodejs',
            tags: {},
            fields: { workers: Object.keys(cluster.workers || {}).length || 1 }
          })
        }
      }, config.collectionInterval)

      // unref so we can gracefully exit
      if (timerId.unref) {
        timerId.unref()
      }
    }
  })

  return hAgent
}

/**
 * Make sure we deoptimize small part of fn
 */
function safeProcess (ctx, fn) {
  return function processRequest (req, res) {
    try {
      fn(ctx, req, res)
    } catch (ex) {
      ctx.logger.error(ex)
    }
  }
}

/**
 * Req/res handler for monitoring
 * @param  {Object} ctx
 * @param  {http.IncomingMessage} req
 * @param  {http.ServerResponse} res
 */
function monitorHttp (ctx, req, res) {
  var stopwatch = ctx.timer.start()

  function endOfConnectionHandler () {
    // cached vars
    var stats = ctx.stats
    var histogram = ctx.histogram

    // capture duration
    var duration = stopwatch.end()
    stopwatch = null
    stats.meter('requests').mark()

    // duration is in ms as float with nanosecond precision,
    // but we use microseconds with the backend
    histogram.update(Math.round(duration * 1000), Date.now())
    if (res.getHeader) {
      ctx.resSize += ((res.getHeader('Content-Length') || 0) * 1)
    }

    if (req.headers) {
      ctx.reqSize += (req.headers['content-length'] || 0) * 1
    }

    // capture special response codes
    if (res.statusCode >= 300) {
      if (res.statusCode < 400) {
        stats.meter('3xxRate').mark()
      } else if (res.statusCode < 500) {
        stats.meter('errRate').mark()
        stats.meter('4xxRate').mark()
      } else {
        stats.meter('errRate').mark()
        stats.meter('5xxRate').mark()
      }
    }

    res.removeListener(FINISH_EVENT_NAME, endOfConnectionHandler)
    res.removeListener(ABRUPT_CLOSE_EVENT_NAME, endOfConnectionHandler)

    // this is invoked to cleanup domains from possible timers bound to it
    // cleanDomainNamespace()
  }

  res.on(FINISH_EVENT_NAME, endOfConnectionHandler)
  res.on(ABRUPT_CLOSE_EVENT_NAME, endOfConnectionHandler)
}

/**
 * Monkey-patching!
 */
var origHttpCreateServer = http.createServer
var origHttpsCreateServer = https.createServer

function patchHttpServer (monitorReqHandler) {
  http.createServer = function () {
    var server = origHttpCreateServer.apply(http, arguments)
    server.on('request', monitorReqHandler)
    return server
  }
  http.Server = http.createServer
}

function patchHttpsServer (monitorReqHandler) {
  https.createServer = function () {
    var server = origHttpsCreateServer.apply(https, arguments)
    server.on('request', monitorReqHandler)
    return server
  }
  https.Server = https.createServer
}

function unpatchHttpServer () {
  http.createServer = origHttpCreateServer
  http.Server = origHttpCreateServer
}

function unpatchHttpsServer () {
  https.createServer = origHttpsCreateServer
  https.Server = origHttpsCreateServer
}

module.exports.unpatchHttpServer = unpatchHttpServer
module.exports.unpatchHttpsServer = unpatchHttpsServer
