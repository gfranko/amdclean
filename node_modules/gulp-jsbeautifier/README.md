# gulp-jsbeautifier
[![Build Status](https://travis-ci.org/tarunc/gulp-jsbeautifier.png?branch=master)](https://travis-ci.org/tarunc/gulp-jsbeautifier)
[![NPM version](https://badge.fury.io/js/gulp-jsbeautifier.png)](http://badge.fury.io/js/gulp-jsbeautifier)
[![Coverage Status](https://coveralls.io/repos/tarunc/gulp-jsbeautifier/badge.png)](https://coveralls.io/r/tarunc/gulp-jsbeautifier)
[![Code Climate](https://codeclimate.com/github/tarunc/gulp-jsbeautifier.png)](https://codeclimate.com/github/tarunc/gulp-jsbeautifier)
[![Dependencies](https://david-dm.org/tarunc/gulp-jsbeautifier.png)](https://david-dm.org/tarunc/gulp-jsbeautifier)
[![devDependency Status](https://david-dm.org/tarunc/gulp-jsbeautifier/dev-status.png)](https://david-dm.org/tarunc/gulp-jsbeautifier#info=devDependencies)

> Prettify JavaScript, HTML, CSS, and JSON.

[jsbeautifier.org](http://jsbeautifier.org/) for gulp

## Getting Started
Install the module with: `npm install --save-dev gulp-jsbeautifier`

## Usage

```js
var gulp = require('gulp');
var prettify = require('gulp-jsbeautifier');

gulp.task('git-pre-js', function() {
  gulp.src('./src/foo.js', './src/bar.json')
    .pipe(prettify({config: '.jsbeautifyrc', mode: 'VERIFY_ONLY'}))
});

gulp.task('format-js', function() {
  gulp.src('./src/foo.js', './src/bar.json')
    .pipe(prettify({config: '.jsbeautifyrc', mode: 'VERIFY_AND_WRITE'}))
    .pipe(gulp.dest('./dist'))
});

gulp.task('prettify-html', function() {
  gulp.src('./src/foo.html')
    .pipe(prettify({indentSize: 2}))
    .pipe(gulp.dest('./dist'))
});

gulp.task('prettify-css', function() {
  gulp.src('./src/foo.css')
    .pipe(prettify({indentSize: 2}))
    .pipe(gulp.dest('./dist'))
});
```
Other examples are in the [example folder.](http://github.com/tarunc/gulp-jsbeautifier/tree/master/examples)

See the [js-beautify docs](https://github.com/einars/js-beautify) for options.

## Config
#### options.mode (optional)
Type: `String`
Default value: `VERIFY_AND_WRITE`

If mode is "VERIFY_ONLY", then task will fail if at least one file can be beautified. This is useful for pre-commit check.
If a filename is specified, options and globals defined therein will be used. The `jsbeautifyrc` file must be valid JSON and looks like the one supported by js-beautify itself.

#### options.config (optional)
Type: `String`
Default value: `null`

If a filename is specified, options and globals defined therein will be used. The `jsbeautifyrc` file must be valid JSON and looks like the one supported by js-beautify itself.

### Default options from [js-beautify](https://github.com/einars/js-beautify#options) can be used
```javascript
.pipe(prettify({
    config: "path/to/.jsbeautifyrc",
    html: {
        braceStyle: "collapse",
        indentChar: " ",
        indentScripts: "keep",
        indentSize: 4,
        maxPreserveNewlines: 10,
        preserveNewlines: true,
        unformatted: ["a", "sub", "sup", "b", "i", "u"],
        wrapLineLength: 0
    },
    css: {
        indentChar: " ",
        indentSize: 4
    },
    js: {
        braceStyle: "collapse",
        breakChainedMethods: false,
        e4x: false,
        evalCode: false,
        indentChar: " ",
        indentLevel: 0,
        indentSize: 4,
        indentWithTabs: false,
        jslintHappy: false,
        keepArrayIndentation: false,
        keepFunctionIndentation: false,
        maxPreserveNewlines: 10,
        preserveNewlines: true,
        spaceBeforeConditional: true,
        spaceInParen: false,
        unescapeStrings: false,
        wrapLineLength: 0
    }
));
```
Only specifiy options to overwrite.

**NOTE:** All options can be specified similar to [js-beautify](https://github.com/einars/js-beautify#options) using underscore.

## License

(The MIT License)

Copyright (c) 2014 Tarun Chaudhry &lt;tarunc92@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
