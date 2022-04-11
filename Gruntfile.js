const requirejs = require('requirejs');
const amdclean = require('./build/amdclean');
const fs = require("fs");
const Jasmine = require('jasmine');

module.exports = function (grunt) {
    function getHeaderText() {
        let packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8')),
        licenseText = '\n\n/*' + fs.readFileSync('./LICENSE.txt', 'utf8') + '\n*/\n\n',
            currentDate = (function () {
                var today = new Date(),
                    dd = today.getDate(),
                    mm = today.getMonth() + 1,
                    yyyy = today.getFullYear();
    
                if (dd < 10) {
                    dd = '0' + dd
                }
    
                if (mm < 10) {
                    mm = '0' + mm
                }
    
                today = yyyy + '-' + mm + '-' + dd;
                return today;
            }()),
            currentYear = (function () {
                var today = new Date(),
                    yyyy = today.getFullYear();
    
                return yyyy;
            }());
        return '/*! amdclean - v' + packageJson.version + ' - ' + currentDate +
            '\n* https://github.com/gfranko/amdclean' +
            '\n* Copyright (c) ' + currentYear + ' Greg Franko */\n' + licenseText;
    }
    const header = getHeaderText();
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: header,
            },
            build: {
                src: 'src/amdclean.js',
                dest: 'build/amdclean.min.js'
            }
        },
        jshint: {
            amdclean: {
                options: {
                  "loopfunc": true,
                  "evil": true,
                },
                src: ['src/amdclean.js'],
              },
        },
        requirejs: {
            "./build/amdclean.optimized.js": {
                'findNestedDependencies': false,
                'baseUrl': './src/modules/',
                'optimize': 'none',
                'paths': {
                    'amdclean': 'index'
                },
                'include': ['amdclean'],
            }
        },
        amdclean: {
            "./build/amdclean.optimized.cleaned.js": {
                'filePath': "./build/amdclean.optimized.js",
                'transformAMDChecks': false,
                'aggressiveOptimizations': true,
                'ignoreModules': ['esprima', 'estraverse', 'escodegen', 'lodash', 'fs', 'sourcemap_to_ast'], // wtf? parsed name here?
                'removeUseStricts': false,
                'wrap': {
                    // All of the third party dependencies are hoisted here
                    // It's a hack, but it's not too painful
                    'start': ';(function(esprima, estraverse, escodegen, _, sourcemapToAst) {\n',
                    'end': '}(typeof esprima !== "undefined" ? esprima: null, typeof estraverse !== "undefined" ? estraverse: null, typeof escodegen !== "undefined" ? escodegen: null, typeof _ !== "undefined" ? _ : null, typeof sourcemapToAst !== "undefined" ? sourcemapToAst : null));'
                },
                'createAnonymousAMDModule': true
            }
        },
        prepend: {
            "./src/amdclean.js": {
                header: getHeaderText,
                src: "./build/amdclean.optimized.cleaned.js",
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    // Default task(s).
    grunt.registerTask('build', ['requirejs', 'amdclean', 'prepend:./src/amdclean.js']);
    grunt.registerTask('default', ['build', 'jshint:amdclean', 'test']);
    
    grunt.registerTask('lint', ['build', 'jshint:amdclean']);
    grunt.registerTask('minify', ['build', 'jshint:amdclean', 'test', 'uglify']);


    grunt.registerTask('test', 'Runs Jasmine on the Spec File', function() {
        const cb = this.async();
        const jasmine = new Jasmine();
        jasmine.loadConfig({
            spec_dir: 'test/specs',
            spec_files: [
                'convert.js'
            ]
        });
        jasmine.exitOnCompletion = false;
        jasmine.execute().then((data)=>{
            cb(data.overallStatus === "passed");
        });
    });

    grunt.registerMultiTask('requirejs', 'Uses RequireJS to optimize a file', function () {
        const target = this.target;
        const data = this.data;
        const cb = this.async();
        requirejs.optimize({
            ...data,
            out: target,
            'onModuleBundleComplete': function (data) {
                cb();
            }
        });
    });

    grunt.registerMultiTask('amdclean', "Uses AMDClean on a file", function () {
        const target = this.target;
        const data = this.data;
        const code = amdclean.clean({
            ...data,
        });
        fs.writeFileSync(target, code);
    });
    grunt.registerMultiTask('prepend', 'Prepends some text to a file', function() {
        const target = this.target;
        const data = this.data;
        let header = data.header;
        if(typeof header === "function") {
            header = header();
        }
        const file = header + fs.readFileSync(data.src);
        fs.writeFileSync(target, file);
    })
};