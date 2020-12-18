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
const { Agent, Config } = require('spm-agent')

const addMetrics = function (agent) {
  const timestamp = new Date()
  const dockerMetric = {
    timestamp: timestamp,
    measurement: 'container',
    tags: {},
    fields: {
      count: 1
    }
  }
  agent.addMetrics(dockerMetric)
}

function getDockerStats () {
  return {
    start: function (agent) {
      this.timerId = setInterval(function () {
        addMetrics(agent)
      }, Config.collectionInterval)
      if (this.timerId.unref) {
        this.timerId.unref()
      }
    },
    stop: function () {
      clearInterval(this.timerId)
    }
  }
}

module.exports = function () {
  const a = getDockerStats()
  return new Agent(a)
}
