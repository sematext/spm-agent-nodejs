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

const http = require('http')
const https = require('https')

// constants
const FINISH_EVENT_NAME = 'finish'
const ABRUPT_CLOSE_EVENT_NAME = 'close'

module.exports = function httpServerAgent () {
  const { Agent, Config, Logger } = require('spm-agent')
  const Measured = require('measured-core')
  const histogram = new Measured.Histogram()
  const timer = new Measured.Timer()

  // setup context for monitoring
  const ctx = {
    reqSize: 0,
    resSize: 0,
    timer: timer,
    logger: Logger,
    histogram: histogram,
    stats: Measured.createCollection()
  }

  // bind monitorHttp safely
  const monitor = safeProcess(ctx, monitorHttp)

  // setup monitoring agent
  const hAgent = new Agent({
    start: function (agent) {
      this._agent = agent
      patchHttpServer(monitor)
      patchHttpsServer(monitor)
      const timerId = setInterval(function () {
        const stats = ctx.stats
        const httpStats = stats.toJSON()
        const responseTimes = histogram.toJSON()
        const now = Date.now()
        const metricValue = {
          requests: httpStats.requests ? httpStats.requests.count : 0, // http.requestCount (int)
          errors: httpStats.errRate ? httpStats.errRate.count : 0, // http.errorCount (int)
          'errors.3xx': httpStats['3xxRate'] ? httpStats['3xxRate'].count : 0, // http.3xx (int)
          'errors.4xx': httpStats['4xxRate'] ? httpStats['4xxRate'].count : 0, // http.4xx (int)
          'errors.5xx': httpStats['5xxRate'] ? httpStats['5xxRate'].count : 0, // http.5xx (int)
          'requests.size.total': ctx.reqSize,
          'response.size.total': ctx.resSize,
          'responses.latency.min': Number(responseTimes.min),
          'responses.latency.max': Number(responseTimes.max),
          'responses.time': Number(responseTimes.sum)
        }

        if (metricValue.requests > 0 || metricValue.errors > 0) {
          agent.addMetrics({ timestamp: now, measurement: 'nodejs', tags: {}, fields: metricValue })
        }

        // cleanup aggregate stats
        stats.end()

        // create & reset new metrics
        ctx.stats = Measured.createCollection()
        histogram.reset()
        timer.reset()
        ctx.reqSize = 0
        ctx.resSize = 0
      }, Config.collectionInterval)

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
  let stopwatch = ctx.timer.start()

  function endOfConnectionHandler () {
    // cached consts
    const stats = ctx.stats
    const histogram = ctx.histogram

    // capture duration
    const duration = stopwatch.end()
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
const origHttpCreateServer = http.createServer
const origHttpsCreateServer = https.createServer

function patchHttpServer (monitorReqHandler) {
  http.createServer = function () {
    const server = origHttpCreateServer.apply(http, arguments)
    server.on('request', monitorReqHandler)
    return server
  }
  http.Server = http.createServer
}

function patchHttpsServer (monitorReqHandler) {
  https.createServer = function () {
    const server = origHttpsCreateServer.apply(https, arguments)
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
