/*
 * gulp-jsbeautifier
 * https://github.com/tarunc/gulp-jsbeautifier
 *
 * Copyright (c) 2014 Tarun Chaudhry
 * Licensed under the MIT license.
 */

/* globals describe, it */

'use strict';

var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var expect = require('chai').expect;
var prettify = require('../');
var _ = require('lodash');

var FIXTURES_PATH = './fixtures/';

var EXPECTED_PATH = './expected/';

var files = fs.readdirSync(path.join(__dirname, FIXTURES_PATH));

describe('gulp-jsbeautifier', function () {
  _.forEach(files, function(file) {
    it('should prettify ' + file, function (done) {
      var opts = {};
      if (file.indexOf('.js') > 0 || file.indexOf('.json') > 0) {
        opts = {
          config: path.join(__dirname, '.jsbeautifyrc')
        };
      } else {
        opts = {
          indentSize: 2
        };
      }

      var prettyStream = prettify(opts);
      var fakeFile = new gutil.File({
        base: path.join(__dirname, FIXTURES_PATH),
        cwd: __dirname,
        path: path.join(__dirname, FIXTURES_PATH, file),
        contents: fs.readFileSync(path.join(__dirname, FIXTURES_PATH, file))
      });

      prettyStream.once('data', function(newFile){
        expect(String(newFile.contents)).to.equal(String(fs.readFileSync(path.join(__dirname, EXPECTED_PATH, file))));
        done();
      });

      prettyStream.write(fakeFile);
    });
  });

  it('should handle null files correctly', function(done) {
    var prettyStream = prettify();
    var fakeFile = new gutil.File({
      base: path.join(__dirname, FIXTURES_PATH),
      cwd: __dirname,
      path: path.join(__dirname, FIXTURES_PATH, 'foo.js'),
      contents: null
    });

    prettyStream.once('data', function(newFile){
      expect(newFile).to.equal(fakeFile);
      done();
    });

    prettyStream.write(fakeFile);
  });
});