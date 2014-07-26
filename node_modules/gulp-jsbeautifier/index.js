/*
 * gulp-jsbeautifier
 * https://github.com/tarunc/gulp-jsbeautifier
 * Copyright (c) 2014 Tarun Chaudhry
 * Licensed under the MIT license.
 */


var es = require('event-stream');
var prettify = require('js-beautify');
var gutil = require('gulp-util');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var stringUtils = require('underscore.string');

var jsbeautifier = prettify.js;
var cssbeautifier = prettify.css;
var htmlbeautifier = prettify.html;

function convertCamelCaseToUnderScore(config) {
  var underscoreKey;
  _.forEach([config.js, config.css, config.html], function(conf) {
    _.forEach(conf, function(value, key) {
      underscoreKey = stringUtils.underscored(key);
      if ('fileTypes' !== key && key !== underscoreKey) {
        conf[underscoreKey] = value;
        delete conf[key];
      }
    });
  });
}

function getFileType(file, config) {
  var fileType = null,
      fileMapping = {
      'js': config.js.fileTypes,
      'css': config.css.fileTypes,
      'html': config.html.fileTypes
      };

  _.forEach(fileMapping, function(extensions, type) {
    fileType = type;
    return -1 === _.findIndex(extensions, function(ext) {
      return stringUtils.endsWith(file.relative, ext);
    });
  });

  return fileType;
}

function getBeautifierSetup(file, config) {
  var fileType = getFileType(file, config);

  return {
    js: [jsbeautifier, config.js, true],
    css: [cssbeautifier, config.css],
    html: [htmlbeautifier, config.html]
  }[fileType];
}

function beautify(file, config, actionHandler) {
  var setup = getBeautifierSetup(file, config);
  if (!setup) {
    gutil.log('Cannot beautify ' + file.relative + ' (only js, css and html files can be beautified)');
    return;
  }

  var beautifier = setup[0],
      beautifyConfig = setup[1],
      addNewLine = setup[2];

  gutil.log('Beautifying', file.relative);
  var original = file.contents.toString('utf8');

  var result = beautifier(original, beautifyConfig);
  // jsbeautifier would skip the line terminator for js files
  if (addNewLine) {
    result += '\n';
  }

  return actionHandler(file, result);
}

function verifyActionHandler(cb) {
  return function verifyOnly(file, result) {
    /*jshint eqeqeq: false */
    if (file.contents.toString('utf8') == result || file.contents.toString('utf8') == result.substr(0, result.length - 1)) {
      return cb(null, file);
    }

    // return cb(null, file);
    var errOpts = {
      message: 'Beautify failed for: ' + file.relative,
      showStack: false
    };

    return cb(new gutil.PluginError('gulp-jsbeautifier', errOpts, { showStack: false }), file);
  };
}

function verifyAndWriteActionHandler(cb) {
  return function verifyAndWrite(file, result) {
    file.contents = new Buffer(result, 'utf8');
    return cb(null, file);
  };
}

module.exports = function prettify(params) {
  'use strict';

  params = params || {
    showStack: false
  };

  _.defaults(params, {
    mode: 'VERIFY_AND_WRITE',
    js: {},
    css: {},
    html: {}
  });

  var config;
  if (params.config) {
    var baseConfig = JSON.parse(fs.readFileSync(path.resolve(_.isString(params.config) ? params.config : '.jsbeautifyrc')));

    config = {
      js: {},
      css: {},
      html: {}
    };

    _.extend(config.js, baseConfig);
    _.extend(config.css, baseConfig);
    _.extend(config.html, baseConfig);
    _.extend(config.js, baseConfig.js);
    _.extend(config.css, baseConfig.css);
    _.extend(config.html, baseConfig.html);
    _.extend(config.js, params.js);
    _.extend(config.css, params.css);
    _.extend(config.html, params.html);
  } else {
    config = params;
  }

  config.js.fileTypes = _.union(config.js.fileTypes, ['.js', '.json']);
  config.css.fileTypes = _.union(config.css.fileTypes, ['.css']);
  config.html.fileTypes = _.union(config.html.fileTypes, ['.html']);

  convertCamelCaseToUnderScore(config);

  var actionHandler = 'VERIFY_ONLY' === params.mode ? verifyActionHandler : verifyAndWriteActionHandler;

  return es.map(function(file, cb) {
    if (file.isNull()) {
      return cb(null, file); // pass along
    }

    if (file.isStream()) {
      return cb(new gutil.PluginError('gulp-jsbeautifier', 'Streaming not supported'));
    }

    try {
      return beautify(file, config, actionHandler(cb, params));
    } catch (err) {
      return cb(new gutil.PluginError('gulp-jsbeautifier', err, params));
    }
  });
};
