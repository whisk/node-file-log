'use strict';

var fs     = require('fs'),
    assert = require("assert"),
    util   = require('util');

var _LOG_LEVELS = {
  debug:   7,
  info:    6, // default
  notice:  5,
  warn:    4,
  error:   3,
  crit:    2,
  alert:   1,
  fatal:   0
};
var log_level = _LOG_LEVELS.info; // default log level

var stdout;
var filename;
var airbrake;

function Logger() {
}

// actual logging
function log(name, args) {
  if (log_level >= _LOG_LEVELS[name]) {
    var s = '[' + getTime() + '] [' + name.toUpperCase() + '] [' + process.pid + '] ';
    s += util.format.apply(util.format, args);
    if (stdout.writable) {
      stdout.write(s + '\n');
    }
  }
}

function addZero(val) {
  return val >= 10 ? val : '0' + val;
}

function add2Zero(val) {
  return val >= 10 ?
    val >= 100 ? val : '0' + val :
    '00' + val;
}

// TODO: rewrite using util.format
function getTime() {
  var d = new Date();
  return d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' +
    addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) +
    '.' + add2Zero(d.getMilliseconds());
}

exports.init = function(mode, handleFatals) {
  var proto = mode ? Logger.prototype : console;
  var loggerObj = mode ? new Logger() : console;

  // define methods for each log level
  for (var level_name in _LOG_LEVELS) {
    proto[level_name] = function(l) {
      log(l, Array.prototype.slice.call(arguments, 1));
    }.bind(proto, level_name);
  }

  proto.setLevel = function(level) {
    level = (level || '').toLowerCase();
    assert(_LOG_LEVELS[level] != null, 'Log level shoud be one of ' + Object.keys(_LOG_LEVELS).join(', '));
    log_level = _LOG_LEVELS[level];
    return loggerObj;
  };

  proto.setAirbrake = function(_airbrake) {
    if (_airbrake && _airbrake.constructor.name == 'Airbrake') {
      airbrake = _airbrake;
    }
    return loggerObj;
  };

  proto.setFile = function(file, callback) {
    if (!file) {
      // XXX: why this?
      if (callback) callback();
    } else {
      // file might be file handler, not file name
      stdout = fs.createWriteStream(file, {flags: 'a', mode: '0644', encoding: 'utf8'});
      stdout
      .addListener('error', function(err) {
        proto.fatal('Error creating log file:', err);
        callback(err);
      }).addListener('open', function() {
        filename = file;
        process.__defineGetter__("stdout", function() {
          return stdout;
        });
        process.__defineGetter__("stderr", function() {
          return stdout;
        });

        proto.log = function() {
          if (stdout.writable) {
            stdout.write(util.format.apply(this, arguments) + '\n');
          }
        };
        if (callback) callback();
      });
    }
    return loggerObj;
  };

  proto.reopen = function(callback) {
    if (stdout) {
      stdout.end();
      proto.setFile(filename, function() {
        stdout.write('[' + this.getTime() + '] Reopened log file by SIGUSR1\n');
        if (callback) callback();
      });
    }
  };

  proto.flush = function(callback) {
    if (stdout) {
      stdout.write('', undefined, callback);
    }
  };

  // All system error -> fatal
  process.on('uncaughtException', function(err) {
    if (airbrake) {
      airbrake._onError(err, true);
    } else {
      var msg = 'Uncaught exception:' + (err.message || err) + ' ' + err.stack;
      if (handleFatals) {
        loggerObj.fatal(msg);
      } else {
        console.log(msg);
      }
      if (process.stdout.isTTY) {
        process.exit(1);
      } else {
        process.stdout.end(null, null, function() {
          process.exit(1);
        });
      }
    }
  });

  // TODO: add cluster support
  process.on('SIGUSR1', function() {
    loggerObj.reopen();
  });

  return loggerObj;
}