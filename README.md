spm-agent-nodejs
================

[SPM performance monitoring by Sematext](http://www.sematext.com/spm) - this is the Node.js monitoring agent for SPM.

Following information is collected and transmitted to SPM (Cloud or On-Premises version):

- OS Metrics (CPU / Mem)
- Process Memory
- EventLoop Stats
- Garbage Collector Stats
- HTTP Server stats (requests, error rate, response times etc.)
  Working for all HTTP servers that use NodeJS http module including "connect" based frameworks like Express.js, Sails.js
  and others like Hapi.js, ...

  The module is able to run in cluster mode (master/worker), then you need to create one agent instance in each worker.
  OS Metrics are only collected in the Master process.

# Status

This package is part of the release tests - please check our [blog](http://blog.sematext.com) for updates or
contact us [npmjs@sematext.com](mailto:npmjs@sematext.com).
Supported Node-Versions: Node >= 0.10, IO.js >= 1.2

# Installation

```

    npm install spm-agent-nodejs

```

Get a free account and create a Node.js API token at [www.sematext.com](https://apps.sematext.com/users-web/register.do)

#configuration

We use https://www.npmjs.com/package/rc for configuration. This means config parameters can be passed via several config
locations commandline args or ENV variables. We recommend to use a file in current directory in ini or JSON format called

        ./.spmagentrc
        -----------------
        {
            "tokens": {
                "spm": 'YOUR_APP_TOKEN'
            },
            // needs to be changed if you run local SPM Server  e.g.:
            spmSenderBulkInsertUrl: 'https://spm-receiver.my-domain.com:443/receiver/v1/_bulk',
            "logger": {
                "dir": './spmlogs',
                "console": false,
                "maxfiles": '3',
                "maxsize":  '1048576',
                "filename": 'spm'
            }
        }


 The alternative INI format:

    [tokens]
      spm = TOUR_APP_TOKEN
    [logger]
      console = true


The only required setting is the SPM Application Token, this could be set via config file ".spmagentrc" or environment variable:

    export spmagent_tokens__spm="YOUR-SPM-APP-TOKEN"

Please note the use of double "_" for nested properties


# Usage

Add this line at the begin of your source code / main script / app.js

```

    var SpmAgent = new require ('spm-agent-nodejs')

```

##  Start existing applications in monitor mode without touching source

1) Copy the helper script to the directory of your app

    cp ./node_modules/spmagent/bin/spmmonitor.js .


2) Start your app using the monitor script

    ./spmmonitor app.js

Please note you can pass your individual commandline arguments for your script as usual. SPM Monitor removes its own arguments from the list.

# Monitoring activity and errors

Please check out the already released package [spm-metrics-js](https://www.npmjs.com/package/spm-metrics-js) to monitor any custom metric in your application.

# LICENCE

      Copyright (c) Sematext Group, Inc.
      All Rights Reserved

      SPM for NodeJS is free-to-use, proprietary software.
      THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
      This source code may not be copied, reverse engineered, or altered for any purpose.
      This source code is to be used exclusively by users and customers of Sematext.
      Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.

