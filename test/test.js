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
var SpmAgent = require('spm-agent')
var config = SpmAgent.Config
var port = (process.env.NJS_TEST_PORT || 8097)
var receiverUrl = 'http://127.0.0.1:' + port
config.rcFlat.spmSenderBulkInsertUrl = receiverUrl

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
  it('OS Agent sends metrics', function (done) {
    try {
      this.timeout(32000)

      var OsAgent = require('spm-agent-os')
      var agent = new OsAgent()
      agent.start()
      var checkMetric = function (metric) {
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
    const NjsAgent = require('../lib/index.js')
    let metricCounter = 0

    function checkMetrics (metric) {
      const { uptime, processes } = metric.fields

      if (uptime) {
        metricCounter++
      }
      if (processes) {
        metricCounter++
      }

      if (metricCounter > 1) {
        NjsAgent.removeListener('metric', checkMetrics)
        done()
        NjsAgent.stop()
      }
    }
    NjsAgent.on('metric', checkMetrics)
  })

  /**
   *  This test case needs adjustments
  it('FAIL EXPECTED - Wait to fail with wrong SPM-Receiver URL', function (done) {
    this.timeout(10000)
    config.transmitInterval = 1000
    config.collectionInterval = 500
    config.retransmitInterval = 1000
    config.recoverInterval = 1000
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'
    var SpmAgent = require('spm-agent')
    var ElAgent = require('../lib/eventLoopAgent.js')
    var elagent = new ElAgent()
    var agent = new SpmAgent('https://NOTREACHABLE:443/receiver/v1/_bulk')
    agent.createAgent(elagent)
    var checkMetric = function (stats) {
      if (stats.error > 0) {
        agent.stop()
        done()
      } else if (stats.send > 0) {
        done('how could it send when URL is not correct? - pls. check config settings')
      }
    }
    agent.once('stats', checkMetric)
  })
  */
  // it('SUCCESS EXPECTED - Wait for successful transmission to correct SPM-Receiver URL', function (done) {
  //   this.timeout(45000)
  //   var SpmAgent = require('spm-agent')
  //   var agent = new SpmAgent(receiverUrl)
  //   var ElAgent = require('../lib/eventLoopAgent.js')
  //   var elagent = new ElAgent()
  //   agent.createAgent(elagent)
  //   function checkMetrics (stats) {
  //     // console.log(stats)
  //     if (stats.send > 0) {
  //       done()
  //       agent.stop()
  //     } else if (stats.error > 0) {
  //       done('send errors in SPM')
  //       agent.removeListener('stats', checkMetrics)
  //       agent.stop()
  //     } else {
  //       // if old metricsdb is in local dir we might get retransmit as first event
  //       // so we need to register again
  //       // console.log (stats)
  //       agent.once('stats', checkMetrics)
  //     }
  //   }
  //   agent.once('stats', checkMetrics)
  // })
  /**
   * this case needs adjustments, influx interface is missing stats for retransmission
  it('RETRANSMIT EXPECTED - 1st wrong SPM-Receiver URL, then correct URL, wait for retransmit', function (done) {
    this.timeout(90000)
    config.collectionInterval = 500
    config.retransmitInterval = 1000
    config.recoverInterval = 1000
    config.transmitInterval = 500
    config.maxDataPoints = 1
    config.logger.console = true
    // config.logger.level = 'debug'
    var SpmAgent = require('spm-agent')
    var agent = new SpmAgent('https://NOT_REACHABLE:443/receiver/v1/_bulk')
    var OsAgent = require('spm-agent-os')
    var oagent = new OsAgent()
    agent.createAgent(oagent)
    setTimeout(function () {
      agent.setUrl(receiverUrl)
    }, 5000)
    var eventReceived = false
    agent.on('stats', function (stats) {
      if (stats.retransmit > 0) {
        if (eventReceived) {
          return
        } else {
          eventReceived = true
        }
        done()
      }
    })
  })
  */
})
