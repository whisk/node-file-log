'use strict';

var fs      = require('fs'),
    assert  = require('assert'),
    util    = require('util'),
    cluster = require('cluster');

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

var stdout, filename, airbrake;

function Logger() { }

// actual logging
function log(name, args) {
  if (log_level >= _LOG_LEVELS[name]) {
    var s = '[' + getTime() + '] [' + name.toUpperCase() + '] [' + process.pid + '] ';
    s += util.format.apply(util.format, args);
    if (stdout && stdout.writable) {
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
function getTime(d) {
  if (d == null)
    d = new Date();
  return d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' +
    addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) +
    '.' + add2Zero(d.getMilliseconds());
}
exports.getTime = getTime;

exports.init = function(consoleObject, handle_fatals) {
  var proto = consoleObject === null ? Logger.prototype : consoleObject;
  var logger = consoleObject === null ? new Logger() : consoleObject;

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
    return logger;
  };

  proto.setAirbrake = function(_airbrake) {
    assert(_airbrake && _airbrake.constructor.name == 'Airbrake', 'Not an Airbrake object');
    airbrake = _airbrake;
    return logger;
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
    return logger;
  };

  proto.reopen = function(callback) {
    if (stdout) {
      stdout.end();
      proto.setFile(filename, function() {
        proto.notice('Reopened log file by SIGUSR1');
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
      if (handle_fatals) {
        logger.fatal(msg);
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

  if (cluster.isMaster) {
    for (var id in cluster.workers) {
      cluster.workers[id].process.kill('SIGUSR1');
    }
  } else {
    process.on('SIGUSR1', function() {
      logger.reopen();
    });
  }

  return logger;
}