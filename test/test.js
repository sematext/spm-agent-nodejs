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

var assert = require("assert")

var token = {spm: process.env.SPM_TOKEN, logsene: process.env.LOGSENE_TOKEN}
var leak = [];

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var config = require('spm-agent').Config
var os = require('os')

describe("SPM for NodeJS tests", function () {

  it("OS Agent sends metrics", function (done) {
    try {
      config.collectionInterval = 1000
      var OsAgent = require('../lib/osAgent.js')
      var agent = new OsAgent()
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

  it("GC Agent sends metrics", function (done) {
    try {
      config.collectionInterval = 1000
      var GcAgent = require('../lib/gcAgent.js')
      var agent = new GcAgent()
      agent.start()
      var checkMetric = function () {
        agent.stop()
        done()
      }
      agent.once('metric', checkMetric)
    } catch (err) {
      done(err)
    }

  })


  it("EventLoop Agent sends metrics", function (done) {
    try {
      this.timeout(95000);
      config.collectionInterval = 1000
      var ElAgent = require('../lib/eventLoopAgent.js')
      var agent = new ElAgent()
      agent.start()
      var checkMetric = function (m) {
        agent.removeListener('metric', checkMetric)
        agent.stop()
        done()
      }
      agent.once('metric', checkMetric)
    } catch (err) {
      done(err)
    }
  })

  it("NJS - Wait for metrics of GC, eventLoop and OS monitor", function (done) {
    this.timeout(15000);
    config.collectionInterval = 300
    config.retransmitInterval = 600
    config.recoverInterval = 600
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'
    var NjsAgent = require('../lib/index.js')
    var metricTypes = {gc: 0, eventloop: 0, numWorkers: 0}

    function checkMetrics (metric) {
      metricTypes[metric.name] = 1
      var checksum = metricTypes.gc + metricTypes.eventloop + metricTypes.numWorkers
      // console.log (metricTypes)
      if (checksum > 2) {
        NjsAgent.removeListener('metric', checkMetrics)
        done()
        NjsAgent.stop()
      }
    }

    NjsAgent.on('metric', checkMetrics)

  })

  it("FAIL EXPECTED - Wait to fail with wrong SPM-Receiver URL", function (done) {
    this.timeout(95000);
    config.collectionInterval = 300
    config.retransmitInterval = 600
    config.recoverInterval = 600
    config.maxDataPoints = 1
    config.logger.console = false
    config.logger.level = 'debug'

    var SpmAgent = require('spm-agent')
    var ElAgent = require('../lib/eventLoopAgent.js')
    var elagent = new ElAgent()
    var agent = new SpmAgent('https://NOTREACHABLE-spm-receiver.sematext.com:443/receiver/v1/_bulk')
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

  it("SUCCESS EXPECTED - Wait for successful transmission to correct SPM-Receiver URL", function (done) {
    this.timeout(95000);
    var SpmAgent = require('spm-agent')
    var agent = new SpmAgent('https://spm-receiver.sematext.com:443/receiver/v1/_bulk')
    var ElAgent = require('../lib/eventLoopAgent.js')
    var elagent = new ElAgent()
    agent.createAgent(elagent)
    function checkMetrics (stats) {
      //console.log (stats)
      if (stats.send > 0) {
        agent.stop()
        done()
      } else if (stats.error > 0) {
        agent.removeListener('stats', checkMetrics)
        done('send errors in SPM')
      } else {
        // if old metricsdb is in local dir we might get retransmit as first event
        // so we need to register again
        // console.log (stats)
        agent.once('stats', checkMetrics)
      }

    }

    agent.once('stats', checkMetrics)

  })

  it("RETRANSMIT EXPECTED - 1st wrong SPM-Receiver URL, then correct URL, wait for retransmit", function (done) {
    this.timeout(125000);
    config.collectionInterval = 500
    config.retransmitInterval = 500
    config.recoverInterval = 500
    config.transmitInterval = 500
    config.maxDataPoints = 1
    config.logger.console = false
    //config.logger.level = 'debug'
    var SpmAgent = require('spm-agent')
    var agent = new SpmAgent('https://NOT_REACHABLE-spm-receiver.sematext.com:443/receiver/v1/_bulk')
    var ElAgent = require('../lib/eventLoopAgent.js')
    var elagent = new ElAgent()
    agent.createAgent(elagent)
    setTimeout(function () {
      agent.setUrl('https://spm-receiver.sematext.com:443/receiver/v1/_bulk')
    }, 3000)
    var eventReceived = false
    agent.on('stats', function (stats) {
      //console.log ('%d %d %d', stats.retransmit, stats.send, stats.error)
      if (stats.retransmit > 0) {
        if (eventReceived)
          return
        else
          eventReceived = true
        done()
      }
    })

  })


  it("Generic HTTP Server Agent sends metrics", function (done) {
    try {
      this.timeout(20000);
      config.collectionInterval = 200
      config.logger.console = true
      config.logger.level = 'debug'
      var njsAgent = require('../lib/index.js')
      var port = (process.env.NJS_TEST_PORT || 8095)

      function httpTest (testDone) {
        try {
          var http = require('http')
          http.createServer(function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'})
            res.end('Hello World\n')
          }).listen(port, '127.0.0.1')
          // console.log('Listening on ' + port)
          var checkMetric = function (metric) {
            //console.log (metric)
            if (metric.name === 'http')
              done()
          }
          njsAgent.on('metric', checkMetric)
        } catch (ex) {
          console.log('Error in HTTP Worker:' + ex.stack)
        }
      }

      httpTest()
      setTimeout(function () {
        var request = require('request')
        request.get('http://127.0.0.1:' + (port) + '/', function (err, res) {
          if (err)
            console.log('Error' + err.stack)
          // else console.log(res.body)

        })
      }, 600)
    } catch (err) {
      done(err)
    }
  })
})
