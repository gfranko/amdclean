/*
  AMDClean Build File
*/
var gulp = require('gulp'),
  uglify = require('gulp-uglify'),
  jshint = require('gulp-jshint'),
  jasmine = require('gulp-jasmine'),
  rename = require('gulp-rename'),
  insert = require('gulp-insert'),
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
               '\n* Copyright (c) ' + currentYear + ' Greg Franko */\n',
  error = false;

gulp.task('build', function() {
  requirejs.optimize({
    'findNestedDependencies': false,
    'baseUrl': './src/modules/',
    'optimize': 'none',
    'include': ['index'],
    'out': './src/amdclean.js',
    'onModuleBundleComplete': function(data) {
      var outputFile = data.path,
        cleanedCode = (function() {
          try {
            return amdclean.clean({
              'filePath': outputFile,
              'transformAMDChecks': false,
              'aggressiveOptimizations': true,
              'ignoreModules': ['esprima', 'estraverse', 'escodegen', 'lodash', 'fs'],
              'removeUseStricts': false,
              'wrap': {
                // All of the third party dependencies are hoisted here
                // It's a hack, but it's not too painful
                'start': ';(function() {\nvar esprima, estraverse, escodegen, _;\n',
                'end': '}());'
              }
            });
          } catch(e) {
            error = true;
            return '' + e;
          }
        }()),
        fullCode = headerText + licenseText + cleanedCode;

      if(error) {
        console.log('Looks like there was an error building, stopping the build... ' + cleanedCode);
        return;
      }
      fs.writeFileSync(outputFile, fullCode);
    }
  }, function() {
    if(!error) {
      gulp.run('lint', 'test', 'minify');
    }
  }, function(err) {
    console.log('Looks like there was an error building, stopping the build... ', err);
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
    .pipe(insert.prepend(headerText + licenseText))
    .pipe(rename('amdclean.min.js'))
    .pipe(gulp.dest('build/'));
});

// The default task (called when you run `gulp`)
gulp.task('default', function() {
  gulp.run('build');
});

gulp.task('amdclean-watch', function() {
  gulp.watch('src/modules/*.js', function(event) {
    gulp.run('build');
  });
});