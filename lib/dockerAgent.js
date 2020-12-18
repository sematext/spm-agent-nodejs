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
const Docker = require('dockerode')
const docker = new Docker()
const infraToken = Config.tokens.infra
const monitoringToken = Config.tokens.monitoring
const os = require('os')
const containerId = os.hostname()

const addMetrics = function (agent) {
  const timestamp = new Date()
  try {
    const container = docker.getContainer(containerId)
    container.inspect((err, data) => {
      if (err) {
        return console.error(err)
      }

      const dockerMetric = {
        timestamp: timestamp,
        measurement: 'container',
        tags: {
          token: infraToken,
          'container.id': data.Id,
          'container.name': data.Name,
          'container.image': data.Config.Image,
          'container.status': data.State.Status
        },
        fields: {
          count: 1
        }
      }
      agent.addMetrics(dockerMetric)
    })
  } catch (error) {
    console.error(error)
  }
}

function getDockerStats () {
  return {
    start: function (agent) {
      if (!infraToken) {
        return
      }

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
