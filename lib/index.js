/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
// var SpmAgent = require('spm-agent')
var SpmAgent = require('../../spm-agent/lib/index')

function NodeJSAgent () {
  if (process.env.SPM_TOKEN && !SpmAgent.Config.tokens.spm) {
    SpmAgent.Config.tokens.spm = process.env.SPM_TOKEN
  }
  var njsAgent = new SpmAgent()
  var agentsToLoad = [
    './eventLoopAgent.js',
    './gcAgent.js',
    'spm-agent-os',
    './httpServerAgent.js',
    './processAgent.js',
    './workerAgent.js'
  ]
  agentsToLoad.forEach(function (a) {
    try {
      var Monitor = require(a)
      njsAgent.createAgent(new Monitor())
    } catch (err) {
      SpmAgent.Logger.error('Error loading agent ' + a + ' ' + err)
    }
  })
  return njsAgent
}

module.exports = NodeJSAgent()
