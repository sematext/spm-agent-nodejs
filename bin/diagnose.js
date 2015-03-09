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
var fs = require("fs");
var zip = require("node-native-zip");
var config = require('spm-agent').Config
var util = require ('util')
var ls = require ('ls')
var path = require ('path')

config.environment = process.env
fs.writeFileSync ( config.logger.dir + '/' + 'cfg-dump.txt', util.inspect (config).toString() )
var archive = new zip();
var logfiles = ls (config.logger.dir + '/*' )
var archFiles = []

logfiles.forEach (function (f){
  console.log ('Adding file ' + f.file + '(' + f.full +')')
  archFiles.push ({name: f.file, path: f.full})
})

//archFiles.push ({name: path.basename(config.config) + path.extname (), path: path.dirname (config.config)})

archive.addFiles(archFiles, function (err) {
  if (err) return console.log("err while adding files", err);
  var buff = archive.toBuffer()
  //console.log (buff.toString())
  fs.writeFileSync ("./spm-dignose.zip", buff)
}, function (err) {
   console.log(err);
})
