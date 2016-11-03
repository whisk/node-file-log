/* eslint-env mocha */
'use strict';

// NOTE:
// 'true' value means require exports an object
// undefined or false make require to override standard console
var assert = require('assert');
var fs     = require('fs');
var log_inner = require('../lib/file-log-inner.js');
var logger;
var logfile;
var data;

describe('Main', function() {
  before(function(){
    logger = log_inner.init(null, false);
    logfile = '/tmp/node-file-log-test.log';
    try {
      fs.unlinkSync(logfile);
    } catch (e) {}
  });

  describe('Inner', function() {
    it('should write to file', function(done) {
      var msg   = 'THIS IS A TEST';

      logger.setFile(logfile, function() {
        logger.debug(msg);
        logger.info(msg);
        logger.notice(msg);

        logger.flush(function() {
          data = fs.readFileSync(logfile).toString();
          assert.ok(data.indexOf('[DEBUG]') == -1, 'Found debug message');
          assert.ok(data.indexOf('[INFO]') >= 0, 'No info message');
          assert.ok(data.indexOf('[NOTICE]') >= 0, 'No notice message');
          assert.ok(data.indexOf(msg) >= 0, 'No message');
          done();
        });
      });
    });

    it('should reopen file', function(done) {
      logger.setFile(logfile, function() {
        logger.reopen(function() {
          data = fs.readFileSync(logfile).toString();
          assert.ok(data.indexOf('[NOTICE]') >= 0, 'No notice message');
          assert.ok(data.indexOf('Reopened log file by SIGUSR1') >= 0, 'No message');
          done();
        });
      });
    });

    it('should format date', function() {
      assert.equal('2016-12-04 01:26:45.123', log_inner.getTime(new Date(2016, 11, 4, 1, 26, 45, 123)));
      assert.equal('2016-01-01 00:00:00.000', log_inner.getTime(new Date(2016, 0, 1, 0, 0, 0, 0)));
      assert.equal('2016-01-01 01:01:01.001', log_inner.getTime(new Date(2016, 0, 1, 1, 1, 1, 1)));
      assert.equal('1900-12-04 01:26:45.123', log_inner.getTime(new Date(1900, 11, 4, 1, 26, 45, 123)));
    });
  });
});