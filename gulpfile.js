/*
  AMDClean Build File
*/
var gulp = require('gulp'),
  uglify = require('gulp-uglify'),
  jshint = require('gulp-jshint'),
  jasmine = require('gulp-jasmine'),
  rename = require('gulp-rename'),
  requirejs = require('requirejs'),
  fs = require('fs'),
  amdclean = require('./build/amdclean'),
  packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8')),
  licenseText = '\n\n/*' + fs.readFileSync('./LICENSE.txt', 'utf8') + '\n*/\n\n',
  currentDate = (function() {
    var today = new Date(),
      dd = today.getDate(),
      mm = today.getMonth()+1,
      yyyy = today.getFullYear();

    if(dd<10) {
        dd = '0' + dd
    } 

    if(mm<10) {
        mm = '0' + mm
    } 

    today = yyyy + '-' + mm + '-' + dd;
    return today;
  }()),
  currentYear = (function() {
    var today = new Date(),
      yyyy = today.getFullYear();

    return yyyy;
  }()),
  headerText = '/*! amdclean - v' + packageJson.version + ' - ' + currentDate +
               '\n* http://gregfranko.com/amdclean' +
               '\n* Copyright (c) ' + currentYear + ' Greg Franko */\n'

gulp.task('build', function() {
  requirejs.optimize({
    'findNestedDependencies': false,
    'baseUrl': './src/modules/',
    'optimize': 'none',
    'include': ['index'],
    'out': './src/amdclean.js',
    'onModuleBundleComplete': function(data) {
      var outputFile = data.path,
        cleanedCode = amdclean.clean({
        'filePath': outputFile,
        'transformAMDChecks': false,
        'aggressiveOptimizations': true,
        'ignoreModules': ['esprima', 'estraverse', 'escodegen', 'lodash', 'fs'],
        'removeUseStricts': false,
        'wrap': {
          'start': ';(function() {\nvar esprima, estraverse, escodegen, _;\n',
          'end': '}());'
        }
      }),
        fullCode = headerText + licenseText + cleanedCode;

      fs.writeFileSync(outputFile, fullCode);
    }
  }, function() {
    gulp.run('lint', 'test', 'minify');
  }, function(err) {
    console.log('there was an error building AMDclean: ', err);
  });
});

gulp.task('lint', function() {
  gulp.src('src/amdclean.js')
    .pipe(jshint({
      'evil': true
    }))
    .pipe(jshint.reporter('default'));
});

gulp.task('test', function() {
  gulp.src('test/specs/convert.js')
      .pipe(jasmine());
});

gulp.task('minify', function() {
  gulp.src(['src/amdclean.js'])
    .pipe(gulp.dest('build/'))
    .pipe(uglify())
    .pipe(rename('amdclean.min.js'))
    .pipe(gulp.dest('build/'));
});

// The default task (called when you run `gulp`)
gulp.task('default', function() {
  gulp.run('build');
});

gulp.task('amdclean-watch', function() {
  gulp.watch('src/amdclean.js', function(event) {
    gulp.run('build');
  });
});