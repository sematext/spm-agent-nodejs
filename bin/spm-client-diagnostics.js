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
var fs = require('fs')
var ZipZipTop = require('zip-zip-top')
var zip = new ZipZipTop()
var config = require('spm-agent').Config
var util = require('util')
var os = require('os')
var path = require ('path')

var systemInfo = {
  operatingSystem: os.type() + ', ' + os.platform() + ', ' + os.release() + ', ' + os.arch(),
  processVersions: process.versions,
  processEnvironment: process.env
}

var cfgDumpFileName = path.join (os.tmpdir(), 'spm-cfg-dump.txt')
fs.writeFileSync(cfgDumpFileName, util.inspect(config).toString() + '\nSystem-Info:\n' + util.inspect(systemInfo))
zip.folder(config.logger.dir)
var archFileName = path.join(os.tmpdir(), 'spm-diagnose.zip')
zip.writeToFile(archFileName)
console.log('SPM diagnostics info is in  ' + archFileName)
console.log('Please e-mail the file to spm-support@sematext.com')
fs.unlink(cfgDumpFileName, function () {})

