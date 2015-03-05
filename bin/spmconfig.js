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
var fs = require ('fs')
var spm_token = ""
if (process.argv.length == 3){
  spm_token = process.argv[2]
}
if (process.env.SPM_TOKEN)
		spm_token = process.env.SPM_TOKEN

var cfgFileContent = '[tokens]\n  spm = ' + spm_token
fs.writeFileSync ('.spmagentrc', cfgFileContent)
console.log ('Create default config to file: ./.spmagentrc \n' + cfgFileContent)

