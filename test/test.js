/*
 * Copyright (c) Sematext Group, Inc.
 * All Rights Reserved
 *
 * SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
/* global describe, it */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
// make sure config has a infra token before spm-agent is laoded first time
if (!process.env.INFRA_TOKEN) {
  process.env.INFRA_TOKEN = 'INFRA_TOKEN'
}
var SpmAgent = require('spm-agent')
var config = SpmAgent.Config
var port = (process.env.NJS_TEST_PORT || 8097)
var receiverUrl = 'http://127.0.0.1:' + port
config.rcFlat.spmSenderBulkInsertUrl = receiverUrl
config.collectionInterval = 1

function httpTest (njsAgent, done) {
  try {
    var checkMetric = function (metric) {
      if (metric.fields.requests) {
        done()
      } else {
        njsAgent.once('metric', checkMetric)
      }
    }
    njsAgent.once('metric', checkMetric)
  } catch (ex) {
    console.error('Error in HTTP Worker:' + ex.stack)
    done(ex)
  }
}

describe('SPM for Node.js tests', function () {
  it('Generic HTTP Server Agent sends metrics', function (done) {
    try {
      this.timeout(25000)
      config.collectionInterval = 500
      var HttpAgent = require('../lib/httpServerAgent.js')
      var njsAgent = new HttpAgent()
      njsAgent.start()
      var http = require('http')
      http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('{"code":"200"}\n')
      }).listen(port, '127.0.0.1')
      httpTest(njsAgent, done)
      setTimeout(function () {
        var request = require('request')
        request.get('http://127.0.0.1:' + (port) + '/', function (err) {
          if (err) {
            console.log('Error' + err.stack)
          }
        })
      }, 700)
    } catch (err) {
      console.error(err.stack)
      done(err)
    }
  })
  it.only('OS Agent sends metrics', function (done) {
    try {
      this.timeout(32000)

      var OsAgent = require('spm-agent-os')
      var agent = new OsAgent()
      agent.start()
      var checkMetric = function (metric) {
        console.log(metric)
        agent.removeListener('metric', checkMetric)
        agent.stop()
        done()
      }
      agent.once('metric', checkMetric)
    } catch (err) {
      done(err)
    }
  })

  it('GC Agent metrics', function (done) {
    try {
      this.timeout(300000)
      var GcAgent = require('../lib/gcAgent.js')
      var agent = new GcAgent()
      agent.start()
      var checkMetric = function () {
        agent.stop()
        done()
      }
      agent.once('metric', checkMetric)
      var wasteMemory = []
      for (var i = 0; i < 300000; i++) {
        var tmp = 'Wasting some memory'
      }

      wasteMemory.push(tmp)
    } catch (err) {
      console.error(err.stack)
      done(err)
    }
  })
  it('EventLoop Agent metrics', function (done) {
    try {
      this.timeout(15000)
      var ElAgent = require('../lib/eventLoopAgent.js')
      var agent = new ElAgent()
      agent.start()
      var checkMetric = function () {
        agent.removeListener('metric', checkMetric)
        agent.stop()
        done()
      }
      agent.once('metric', checkMetric)
    } catch (err) {
      done(err)
    }
  })
  it('Wait for metrics: GC, Event Loop and OS monitor', function (done) {
    this.timeout(30000)
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'
    var NjsAgent = require('../lib/index.js')
    var metricTypes = { gc: 0, eventloop: 0 }

    function checkMetrics (metric) {
      if (metric.fields.time) {
        metricTypes.eventloop = 1
      }
      if (metric.fields['heap.size']) {
        metricTypes.gc = 1
      }
      metricTypes[metric.name] = 1
      var checksum = metricTypes.gc + metricTypes.eventloop
      if (checksum > 1) {
        NjsAgent.removeListener('metric', checkMetrics)
        done()
        NjsAgent.stop()
      }
    }
    NjsAgent.on('metric', checkMetrics)
  })

  it('Wait for metrics: Worker Agent', function (done) {
    this.timeout(30000)
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'
    var NjsAgent = require('../lib/index.js')
    let metricCounter = 0

    function checkMetrics (metric) {
      if (metric.fields && metric.fields.workers) {
        metricCounter++
      }
      if (metricCounter > 0) {
        NjsAgent.removeListener('metric', checkMetrics)
        done()
        NjsAgent.stop()
      }
    }
    NjsAgent.on('metric', checkMetrics)
  })

  it('Wait for metrics: Process Agent', function (done) {
    this.timeout(30000)
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'
    let metricCounter = 0
    let errorReported = false
    const ProcessAgent = require('../lib/processAgent.js')
    const agent = new ProcessAgent()
    agent.start()

    function checkMetrics (metric) {
      if (errorReported) {
        return
      }
      if (metric.measurement && metric.measurement.indexOf('process') > -1 &&
        metric.fields.uptime &&
        metric.fields.rss &&
        metric.fields['cpu.usage'] &&
        metric.fields['thread.count']) {
        if (metric.tags.token !== config.tokens.infra) {
          done(new Error(`No infra token set ${metric.tags.token} != ${config.tokens.infra}`))
          errorReported = true
        }
        metricCounter = metricCounter + 1
      }
      if (metric.measurement && metric.measurement.indexOf('process') > -1 && metric.fields.count) {
        if (metric.tags.token !== config.tokens.infra) {
          done(new Error(`No infra token set ${metric.tags.token} != ${config.tokens.infra}`))
          errorReported = true
        }
        metricCounter = metricCounter + 1
      }

      if (metricCounter > 2) {
        agent.removeListener('metric', checkMetrics)
        agent.stop()
        done()
      }
    }
    agent.on('metric', checkMetrics)
  })
})
