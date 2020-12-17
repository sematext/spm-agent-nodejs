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
const os = require('os')
const containerId = os.hostname()
console.log(containerId)

const addMetrics = function (agent) {
  const timestamp = new Date()
  try {
    docker.info(function dockerInfoHandler (err, data) {
      if (err) {
        return console.error(err)
      }

      const dockerInfo = data
      // console.log(dockerInfo)

      const container = docker.getContainer(containerId)
      container.stats(async (err, data) => {
        if (err) {
          return console.error(err)
        }

        let containerStats
        data.on('data', chunk => {
          containerStats += chunk.toString('utf8')
        })
        data.on('end', () => {
          console.log(containerStats)

          const dockerMetric = {
            timestamp: timestamp,
            measurement: 'docker',
            tags: {
              token: infraToken,
              // 'container.name': dockerInfo.Name,
              'conatiner.id': containerId
            },
            fields: {
              // 'cpu.usage': containerStats.cpu_stats.cpu_usage.total_usage,
              // 'memory.usage': containerStats.memory_stats.usage
            }
          }
          agent.addMetrics(dockerMetric)
        })
      })
    })
  } catch (error) {
    console.error(error)
  }
}

function getDockerStats () {
  return {
    start: function (agent) {
      // if (!infraToken) {
      //   return
      // }

      this.timerId = setInterval(function () {
        addMetrics(agent)
      }, 2000)
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
