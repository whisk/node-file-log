# node-file-log

[![Build Status](https://travis-ci.org/whisk/node-file-log.svg?branch=master)](https://travis-ci.org/whisk/node-file-log)

## Synopsis

Extends standard Node.js console to support files, levels and log reopening by a signal.

    require('file-log');
    console.setFile('node.log', function() {
        console.notice('Hello world!');
    });

Contents of ``node.log``:

    [2016-10-16 17:01:01.386] [INFO] [12345] Hello world!