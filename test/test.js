'use strict';

// NOTE:
// 'true' value means require exports an object
// undefined or false make require to override standard console
var assert = require('assert');
var fs     = require('fs');
var logger;
var logfile;

describe('Main', function() {
  before(function(){
    logger = require('../log-inner.js').init(true, false);
    logfile = '/tmp/node-file-log-test.log';
    try {
      fs.unlinkSync(logfile);
    } catch (e) {}
  });
  describe('Inner', function() {
    it('should write to file', function(done) {
      var msg   = 'THIS IS A TEST';

      logger.setFile(logfile, function() {
        logger.info(msg);
        logger.notice(msg);

        logger.flush(function() {
          var data = fs.readFileSync(logfile).toString();
          assert.ok(data.indexOf('[INFO]') >= 0, 'No info message');
          assert.ok(data.indexOf('[NOTICE]') >= 0, 'No notice message');
          assert.ok(data.indexOf(msg) >= 0, 'No message');
          done();
        });
      });
    });
  });
});