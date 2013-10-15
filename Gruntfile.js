module.exports = function(grunt) {
  var amdclean = require('amdclean');
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      mobileJS: {
        options: {
          baseUrl: './js/app',
          paths: {
            'mobile': 'init/MobileInit'
          },
          wrap: true,
          preserveLicenseComments: false,
          optimize: 'none',
          name: '../libs/almond',
          mainConfigFile: './js/app/config/config.js',
          include: ['mobile'],
          out: './js/app/init/MobileInit.min.js'
        }
      },
      mobileCSS: {
        options: {
          optimizeCss: 'standard',
          cssIn: 'css/app/mobile.css',
          out: 'css/app/mobile.min.css'
        }
      },
      desktopJS: {
        options: {
          baseUrl: './js/app',
          paths: {
            'desktop': 'init/DesktopInit'
          },
          wrap: true,
          preserveLicenseComments: false,
          optimize: 'none',
          name: '../libs/almond',
          mainConfigFile: './js/app/config/config.js',
          include: ['desktop'],
          out: './js/app/init/DesktopInit.min.js'
        }
      },
      desktopCSS: {
        options: {
          optimizeCss: 'standard',
          cssIn: 'css/app/desktop.css',
          out: 'css/app/desktop.min.css'
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', './js/app/**/*.js', '!./js/app/**/*min.js'],
      options: {
        globals: {
          jQuery: true,
          console: false,
          module: true,
          document: true
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['requirejs:desktopJS', 'requirejs:mobileJS', 'requirejs:desktopCSS', 'requirejs:mobileCSS']);
  grunt.registerTask('default', ['test', 'build']);
};
