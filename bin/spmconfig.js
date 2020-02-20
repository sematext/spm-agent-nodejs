#!/usr/bin/env node
/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

let monitoringToken = ''
let infraToken = ''

if (process.env.SPM_TOKEN) { monitoringToken = process.env.SPM_TOKEN }
if (process.env.MONITORING_TOKEN) { monitoringToken = process.env.MONITORING_TOKEN }
if (process.env.INFRA_TOKEN) { infraToken = process.env.INFRA_TOKEN }

if (monitoringToken === '') {
  console.log('[Required] Add a MONITORING_TOKEN to your environment: \'$ export MONITORING_TOKEN=<your-monitoring-token-goes-here>\'')
  process.exit(0)
}
if (infraToken === '') {
  console.log('[Optional] Add an INFRA_TOKEN to your environment: \'$ export INFRA_TOKEN=<your-infra-token-goes-here>\'')
}

let useLinuxAgent = 'false'
if (os.platform() === 'linux') {
  useLinuxAgent = 'true'
}
const cfgLines = [
  "# Please don't change this configuration",
  '# Directory for buffered metrics',
  'useLinuxAgent: ' + useLinuxAgent,
  `dbDir: ${path.join(process.cwd(), 'spmdb')}`,
  ' ',
  '# SPM_MONITOR_TAGS=project:frontend,environment:test,role:testserver',
  '# Application Token for SPM',
  'tokens:',
  `  spm: ${monitoringToken}`,
  `  monitoring: ${monitoringToken}`,
  `${infraToken !== '' ? `  infra: ${infraToken}\n` : ''}`,
  'logger:',
  '  # log file directory default is __dirname / spmlogs',
  `  dir: ${path.join(process.cwd(), 'spmlogs')}`,
  '  # silent = true means no creation of log files',
  '  silent: false ',
  '  # log level for output - debug, info, error, defaults to error to be quiet',
  '  level: error '
]
const cfgFileContent = cfgLines.join('\r\n')
fs.writeFileSync('.spmagentrc', cfgFileContent)
console.log('Create default config to file: ./.spmagentrc \n' + cfgFileContent)
