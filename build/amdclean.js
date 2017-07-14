/*! amdclean - v2.7.1 - 2017-07-14
* http://gregfranko.com/amdclean
* Copyright (c) 2017 Greg Franko */


/*The MIT License (MIT)

Copyright (c) 2014 Greg Franko

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function(esprima, estraverse, escodegen, _, sourcemapToAst) {
// defaultOptions.js
// =================
// AMDclean default options
var defaultOptions, errorMsgs, defaultValues, utils, convertToIIFE, convertToIIFEDeclaration, normalizeModuleName, convertToFunctionExpression, convertToObjectDeclaration, createAst, convertDefinesAndRequires, traverseAndUpdateAst, getNormalizedModuleName, findAndStoreAllModuleIds, generateCode, clean;
defaultOptions = {
  // The source code you would like to be 'cleaned'
  'code': '',
  // Provide a source map for the code you'd like to 'clean'
  // Output will change from plain code to a hash: {code: ..., map: ...}
  // Where code is 'cleaned' code and map is the new source map
  'sourceMap': null,
  // The relative file path of the file to be cleaned.  Use this option if you are not using the code option.
  // Hint: Use the __dirname trick
  'filePath': '',
  // The modules that you would like to set as window properties
  // An array of strings (module names)
  'globalModules': [],
  // All esprima API options are supported: http://esprima.org/doc/
  'esprima': {
    'comment': true,
    'loc': true,
    'range': true,
    'tokens': true
  },
  // All escodegen API options are supported: https://github.com/Constellation/escodegen/wiki/API
  'escodegen': {
    'comment': true,
    'format': {
      'indent': {
        'style': '  ',
        'adjustMultilineComment': true
      }
    }
  },
  // If there is a comment (that contains the following text) on the same line or one line above a specific module, the module will not be removed
  'commentCleanName': 'amdclean',
  // The ids of all of the modules that you would not like to be 'cleaned'
  'ignoreModules': [],
  // Determines which modules will be removed from the cleaned code
  'removeModules': [],
  // Determines if all of the require() method calls will be removed
  'removeAllRequires': false,
  // Determines if all of the 'use strict' statements will be removed
  'removeUseStricts': true,
  // Determines if conditional AMD checks are transformed
  // e.g. if(typeof define == 'function') {} -> if(true) {}
  'transformAMDChecks': true,
  // Determines if a named or anonymous AMD module will be created inside of your conditional AMD check
  // Note: This is only applicable to JavaScript libraries, do not change this for web apps
  // If set to true: e.g. define('example', [], function() {}) -> define([], function() {})
  'createAnonymousAMDModule': false,
  // Allows you to pass an expression that will override shimmed modules return values
  // e.g. { 'backbone': 'window.Backbone' }
  'shimOverrides': {},
  // Determines how to prefix a module name with when a non-JavaScript compatible character is found 
  // 'standard' or 'camelCase'
  // 'standard' example: 'utils/example' -> 'utils_example'
  // 'camelCase' example: 'utils/example' -> 'utilsExample'
  'prefixMode': 'standard',
  // A function hook that allows you add your own custom logic to how each module name is prefixed/normalized
  'prefixTransform': function (postNormalizedModuleName, preNormalizedModuleName) {
    return postNormalizedModuleName;
  },
  // Wrap any build bundle in a start and end text specified by wrap
  // This should only be used when using the onModuleBundleComplete RequireJS Optimizer build hook
  // If it is used with the onBuildWrite RequireJS Optimizer build hook, each module will get wrapped
  'wrap': {
    'start': ';(function() {\n',
    'end': '\n}());'
  },
  // Determines if certain aggressive file size optimization techniques will be used to transform the soure code
  'aggressiveOptimizations': false,
  // Configuration info for modules
  // Note: Further info can be found here - http://requirejs.org/docs/api.html#config-moduleconfig
  'config': {}
};
errorMsgs = {
  // The user has not supplied the cliean method with any code
  'emptyCode': 'There is no code to generate the AST with',
  // An AST has not been correctly returned by Esprima
  'emptyAst': function (methodName) {
    return 'An AST is not being passed to the ' + methodName + '() method';
  },
  // A parameter is not an object literal (which is expected)
  'invalidObject': function (methodName) {
    return 'An object is not being passed as the first parameter to the ' + methodName + '() method';
  },
  // Third-party dependencies have not been included on the page
  'lodash': 'Make sure you have included lodash (https://github.com/lodash/lodash).',
  'esprima': 'Make sure you have included esprima (https://github.com/ariya/esprima).',
  'estraverse': 'Make sure you have included estraverse (https://github.com/Constellation/estraverse).',
  'escodegen': 'Make sure you have included escodegen (https://github.com/Constellation/escodegen).',
  'sourcemapToAst': 'Make sure you have included sourcemapToAst (https://github.com/tarruda/sourcemap-to-ast).'
};
defaultValues = {
  // dependencyBlacklist
  // -------------------
  // Variable names that are not allowed as dependencies to functions
  'dependencyBlacklist': {
    'require': 'remove',
    'exports': true,
    'module': 'remove'
  },
  // defaultLOC
  // ----------
  // Default line of code property
  'defaultLOC': {
    'start': {
      'line': 0,
      'column': 0
    }
  },
  // defaultRange
  // ------------
  // Default range property
  'defaultRange': [
    0,
    0
  ]
};
utils = function () {
  var Utils = {
    // isDefine
    // --------
    // Returns if the current AST node is a define() method call
    'isDefine': function (node) {
      var expression = node.expression || {}, callee = expression.callee;
      return _.isObject(node) && node.type === 'ExpressionStatement' && expression && expression.type === 'CallExpression' && callee.type === 'Identifier' && callee.name === 'define';
    },
    // isRequire
    // ---------
    // Returns if the current AST node is a require() method call
    'isRequire': function (node) {
      var expression = node.expression || {}, callee = expression.callee;
      return node && node.type === 'ExpressionStatement' && expression && expression.type === 'CallExpression' && callee.type === 'Identifier' && callee.name === 'require';
    },
    // isModuleExports
    // ---------------
    // Is a module.exports member expression
    'isModuleExports': function (node) {
      if (!node) {
        return false;
      }
      return node.type === 'AssignmentExpression' && node.left && node.left.type === 'MemberExpression' && node.left.object && node.left.object.type === 'Identifier' && node.left.object.name === 'module' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name === 'exports';
    },
    // isRequireExpression
    // -------------------
    // Returns if the current AST node is a require() call expression
    // e.g. var example = require('someModule');
    'isRequireExpression': function (node) {
      return node && node.type === 'CallExpression' && node.callee && node.callee.name === 'require';
    },
    // isObjectExpression
    // ------------------
    // Returns if the current AST node is an object literal
    'isObjectExpression': function (expression) {
      return expression && expression && expression.type === 'ObjectExpression';
    },
    // isFunctionExpression
    // --------------------
    // Returns if the current AST node is a function
    'isFunctionExpression': function (expression) {
      return expression && expression && expression.type === 'FunctionExpression';
    },
    // isFunctionCallExpression
    // ------------------------
    // Returns if the current AST node is a function call expression
    'isFunctionCallExpression': function (expression) {
      return expression && expression && expression.type === 'CallExpression' && expression.callee && expression.callee.type === 'FunctionExpression';
    },
    // isUseStrict
    // -----------
    // Returns if the current AST node is a 'use strict' expression
    // e.g. 'use strict'
    'isUseStrict': function (expression) {
      return expression && expression && expression.value === 'use strict' && expression.type === 'Literal';
    },
    // isIfStatement
    // -------------
    // Returns if the current AST node is an if statement
    // e.g. if(true) {}
    'isIfStatement': function (node) {
      return node && node.type === 'IfStatement' && node.test;
    },
    // isAMDConditional
    // ----------------
    // Returns if the current AST node is an if statement AMD check
    // e.g. if(typeof define === 'function') {}
    'isAMDConditional': function (node) {
      if (!Utils.isIfStatement(node)) {
        return false;
      }
      var matchObject = {
          'left': {
            'operator': 'typeof',
            'argument': {
              'type': 'Identifier',
              'name': 'define'
            }
          },
          'right': {
            'type': 'Literal',
            'value': 'function'
          }
        }, reversedMatchObject = {
          'left': matchObject.right,
          'right': matchObject.left
        };
      try {
        return _.find(node.test, matchObject) || _.find([node.test], matchObject) || _.find(node.test, reversedMatchObject) || _.find([node.test], reversedMatchObject) || _.find(node.test.left || {}, matchObject) || _.find([node.test.left || {}], matchObject) || _.find(node.test.left || {}, reversedMatchObject) || _.find([node.test.left || {}], reversedMatchObject);
      } catch (e) {
        return false;
      }
    },
    // returnExpressionIdentifier
    // --------------------------
    // Returns a single identifier
    // e.g. module
    'returnExpressionIdentifier': function (name) {
      return {
        'type': 'ExpressionStatement',
        'expression': {
          'type': 'Identifier',
          'name': name,
          'range': defaultValues.defaultRange,
          'loc': defaultValues.defaultLOC
        },
        'range': defaultValues.defaultRange,
        'loc': defaultValues.defaultLOC
      };
    },
    // readFile
    // --------
    // Synchronous file reading for node
    'readFile': function (path) {
      if (typeof exports !== 'undefined') {
        var fs = require('fs');
        return fs.readFileSync(path, 'utf8');
      } else {
        return '';
      }
    },
    // isRelativeFilePath
    // ------------------
    // Returns a boolean that determines if the file path provided is a relative file path
    // e.g. ../exampleModule -> true
    'isRelativeFilePath': function (path) {
      var segments = path.split('/');
      return segments.length !== -1 && (segments[0] === '.' || segments[0] === '..');
    },
    // convertToCamelCase
    // ------------------
    // Converts a delimited string to camel case
    // e.g. some_str -> someStr
    convertToCamelCase: function (input, delimiter) {
      delimiter = delimiter || '_';
      return input.replace(new RegExp(delimiter + '(.)', 'g'), function (match, group1) {
        return group1.toUpperCase();
      });
    },
    // prefixReservedWords
    // -------------------
    // Converts a reserved word in JavaScript with an underscore
    // e.g. class -> _class
    'prefixReservedWords': function (name) {
      var reservedWord = false;
      try {
        if (name.length) {
          eval('var ' + name + ' = 1;');
        }
      } catch (e) {
        reservedWord = true;
      }
      if (reservedWord === true) {
        return '_' + name;
      } else {
        return name;
      }
    },
    // normalizeDependencyName
    // -----------------------
    //  Returns a normalized dependency name that handles relative file paths
    'normalizeDependencyName': function (moduleId, dep) {
      if (!moduleId || !dep) {
        return dep;
      }
      var pluginName = function () {
          if (!dep || dep.indexOf('!') === -1) {
            return '';
          }
          var split = dep.split('!');
          dep = split[1];
          return split[0] + '!';
        }(), normalizePath = function (path) {
          var segments = path.split('/'), normalizedSegments;
          normalizedSegments = _.reduce(segments, function (memo, segment) {
            switch (segment) {
            case '.':
              break;
            case '..':
              memo.pop();
              break;
            default:
              memo.push(segment);
            }
            return memo;
          }, []);
          return normalizedSegments.join('/');
        }, baseName = function (path) {
          var segments = path.split('/');
          segments.pop();
          return segments.join('/');
        };
      if (!Utils.isRelativeFilePath(dep)) {
        return pluginName + dep;
      }
      var moduleBaseName = baseName(moduleId);
      var pathToNormalize = dep;
      if (moduleBaseName) {
        pathToNormalize = [
          baseName(moduleId),
          dep
        ].join('/');
      }
      return pluginName + normalizePath(pathToNormalize);
    },
    // https://gist.github.com/mathiasbynens/6334847
    // ECMAScript 5.1
    'invalidIdentifierStartSymbol': /^[^\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/,
    'invalidIdentifierTrailingSymbol': /[^\$0-9A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/g
  };
  return Utils;
}();
convertToIIFE = function convertToIIFE(obj) {
  var callbackFuncParams = obj.callbackFuncParams, callbackFunc = obj.callbackFunc, dependencyNames = obj.dependencyNames, node = obj.node, range = node.range || defaultValues.defaultRange, loc = node.loc || defaultValues.defaultLOC;
  return {
    'type': 'ExpressionStatement',
    'expression': {
      'type': 'CallExpression',
      'callee': {
        'type': 'FunctionExpression',
        'id': null,
        'params': callbackFuncParams,
        'defaults': [],
        'body': callbackFunc.body,
        'rest': callbackFunc.rest,
        'generator': callbackFunc.generator,
        'expression': callbackFunc.expression,
        'range': range,
        'loc': loc
      },
      'arguments': dependencyNames,
      'range': range,
      'loc': loc
    },
    'range': range,
    'loc': loc
  };
};
convertToIIFEDeclaration = function convertToIIFEDeclaration(obj) {
  var amdclean = this, options = amdclean.options, moduleId = obj.moduleId, moduleName = obj.moduleName, hasModuleParam = obj.hasModuleParam, hasExportsParam = obj.hasExportsParam, callbackFuncParams = obj.callbackFuncParams, isOptimized = obj.isOptimized, callback = obj.callbackFunc, node = obj.node, name = callback.name, type = callback.type, range = node.range || defaultValues.defaultRange, loc = node.loc || defaultValues.defaultLOC, callbackFunc = function () {
      var cbFunc = obj.callbackFunc;
      if (type === 'Identifier' && name !== 'undefined') {
        cbFunc = {
          'type': 'FunctionExpression',
          'id': null,
          'params': [],
          'defaults': [],
          'body': {
            'type': 'BlockStatement',
            'body': [{
                'type': 'ReturnStatement',
                'argument': {
                  'type': 'ConditionalExpression',
                  'test': {
                    'type': 'BinaryExpression',
                    'operator': '===',
                    'left': {
                      'type': 'UnaryExpression',
                      'operator': 'typeof',
                      'argument': {
                        'type': 'Identifier',
                        'name': name,
                        'range': range,
                        'loc': loc
                      },
                      'prefix': true,
                      'range': range,
                      'loc': loc
                    },
                    'right': {
                      'type': 'Literal',
                      'value': 'function',
                      'raw': '\'function\'',
                      'range': range,
                      'loc': loc
                    },
                    'range': range,
                    'loc': loc
                  },
                  'consequent': {
                    'type': 'CallExpression',
                    'callee': {
                      'type': 'Identifier',
                      'name': name,
                      'range': range,
                      'loc': loc
                    },
                    'arguments': callbackFuncParams,
                    'range': range,
                    'loc': loc
                  },
                  'alternate': {
                    'type': 'Identifier',
                    'name': name,
                    'range': range,
                    'loc': loc
                  },
                  'range': range,
                  'loc': loc
                },
                'range': range,
                'loc': loc
              }],
            'range': range,
            'loc': loc
          },
          'rest': null,
          'generator': false,
          'expression': false,
          'range': range,
          'loc': loc
        };
      }
      return cbFunc;
    }(), dependencyNames = function () {
      var depNames = obj.dependencyNames, objExpression = {
          'type': 'ObjectExpression',
          'properties': [],
          'range': range,
          'loc': loc
        }, configMemberExpression = {
          'type': 'MemberExpression',
          'computed': true,
          'object': {
            'type': 'Identifier',
            'name': 'modules'
          },
          'property': {
            'type': 'Literal',
            'value': moduleId
          }
        }, moduleDepIndex;
      if (options.config && options.config[moduleId]) {
        if (hasExportsParam && hasModuleParam) {
          return [
            objExpression,
            objExpression,
            configMemberExpression
          ];
        } else if (hasModuleParam) {
          moduleDepIndex = _.findIndex(depNames, function (currentDep) {
            return currentDep.name === '{}';
          });
          depNames[moduleDepIndex] = configMemberExpression;
        }
      }
      return depNames;
    }(), cb = function () {
      if (callbackFunc.type === 'Literal' || callbackFunc.type === 'Identifier' && callbackFunc.name === 'undefined' || isOptimized === true) {
        return callbackFunc;
      } else {
        return {
          'type': 'CallExpression',
          'callee': {
            'type': 'FunctionExpression',
            'id': {
              'type': 'Identifier',
              'name': '',
              'range': range,
              'loc': loc
            },
            'params': callbackFuncParams,
            'defaults': [],
            'body': callbackFunc.body,
            'rest': callbackFunc.rest,
            'generator': callbackFunc.generator,
            'expression': callbackFunc.expression,
            'range': range,
            'loc': loc
          },
          'arguments': dependencyNames,
          'range': range,
          'loc': loc
        };
      }
    }(), updatedNode = {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'AssignmentExpression',
        'operator': '=',
        'left': {
          'type': 'Identifier',
          'name': options.IIFEVariableNameTransform ? options.IIFEVariableNameTransform(moduleName, moduleId) : moduleName,
          'range': range,
          'loc': loc
        },
        'right': cb,
        'range': range,
        'loc': loc
      },
      'range': range,
      'loc': loc
    };
  estraverse.replace(callbackFunc, {
    'enter': function (node) {
      if (utils.isModuleExports(node)) {
        return {
          'type': 'AssignmentExpression',
          'operator': '=',
          'left': {
            'type': 'Identifier',
            'name': 'exports'
          },
          'right': node.right
        };
      } else {
        return node;
      }
    }
  });
  return updatedNode;
};
normalizeModuleName = function normalizeModuleName(name, moduleId) {
  var amdclean = this, options = amdclean.options, prefixMode = options.prefixMode, prefixTransform = options.prefixTransform, dependencyBlacklist = defaultValues.dependencyBlacklist, prefixTransformValue, preNormalized, postNormalized;
  name = name || '';
  if (name === '{}') {
    if (dependencyBlacklist[name] === 'remove') {
      return '';
    } else {
      return name;
    }
  }
  preNormalized = utils.prefixReservedWords(name.replace(/\./g, '').replace(utils.invalidIdentifierStartSymbol, '').replace(utils.invalidIdentifierTrailingSymbol, '_').replace(/^_+/, ''));
  postNormalized = prefixMode === 'camelCase' ? utils.convertToCamelCase(preNormalized) : preNormalized;
  if (_.isFunction(prefixTransform)) {
    prefixTransformValue = prefixTransform(postNormalized, name);
    if (_.isString(prefixTransformValue) && prefixTransformValue.length) {
      return prefixTransformValue;
    }
  }
  return postNormalized;
};
convertToFunctionExpression = function convertToFunctionExpression(obj) {
  var amdclean = this, options = amdclean.options, ignoreModules = options.ignoreModules, node = obj.node, isDefine = obj.isDefine, isRequire = obj.isRequire, isOptimized = false, moduleName = obj.moduleName, moduleId = obj.moduleId, dependencies = obj.dependencies, depLength = dependencies.length, aggressiveOptimizations = options.aggressiveOptimizations, exportsExpressions = [], moduleExportsExpressions = [], defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = obj.range || defaultRange, loc = obj.loc || defaultLOC, shouldOptimize = obj.shouldOptimize, dependencyBlacklist = defaultValues.dependencyBlacklist, hasNonMatchingParameter = false, callbackFunc = function () {
      var callbackFunc = obj.moduleReturnValue, body, returnStatements, firstReturnStatement, returnStatementArg;
      // If the module callback function is not empty
      if (callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length) {
        // Filter 'use strict' statements
        body = _.filter(callbackFunc.body.body, function (node) {
          if (options.removeUseStricts === true) {
            return !utils.isUseStrict(node.expression);
          } else {
            return node;
          }
        });
        callbackFunc.body.body = body;
        // Returns an array of all return statements
        returnStatements = _.where(body, { 'type': 'ReturnStatement' });
        exportsExpressions = _.where(body, {
          'left': {
            'type': 'Identifier',
            'name': 'exports'
          }
        });
        moduleExportsExpressions = _.where(body, {
          'left': {
            'type': 'MemberExpression',
            'object': {
              'type': 'Identifier',
              'name': 'module'
            },
            'property': {
              'type': 'Identifier',
              'name': 'exports'
            }
          }
        });
        // If there is a return statement
        if (returnStatements.length) {
          firstReturnStatement = returnStatements[0];
          returnStatementArg = firstReturnStatement.argument;
          hasNonMatchingParameter = function () {
            var nonMatchingParameter = false;
            _.each(callbackFunc.params, function (currentParam) {
              var currentParamName = currentParam.name;
              if (!amdclean.storedModules[currentParamName] && !dependencyBlacklist[currentParamName]) {
                nonMatchingParameter = true;
              }
            });
            return nonMatchingParameter;
          }();
          // If something other than a function expression is getting returned
          // and there is more than one AST child node in the factory function
          // return early
          if (hasNonMatchingParameter || !shouldOptimize || !utils.isFunctionExpression(firstReturnStatement) && body.length > 1 || returnStatementArg && returnStatementArg.type === 'Identifier') {
            return callbackFunc;
          } else {
            // Optimize the AMD module by setting the callback function to the return statement argument
            callbackFunc = returnStatementArg;
            isOptimized = true;
            if (callbackFunc.params) {
              depLength = callbackFunc.params.length;
            }
          }
        }
      } else if (callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length === 0) {
        callbackFunc = {
          'type': 'Identifier',
          'name': 'undefined',
          'range': range,
          'loc': loc
        };
        depLength = 0;
      }
      return callbackFunc;
    }(), hasReturnStatement = function () {
      var returns = [];
      if (callbackFunc && callbackFunc.body && _.isArray(callbackFunc.body.body)) {
        returns = _.where(callbackFunc.body.body, { 'type': 'ReturnStatement' });
        if (returns.length) {
          return true;
        }
      }
      return false;
    }(), originalCallbackFuncParams, hasExportsParam = function () {
      var cbParams = callbackFunc.params || [];
      return _.where(cbParams, { 'name': 'exports' }).length;
    }(), hasModuleParam = function () {
      var cbParams = callbackFunc.params || [];
      return _.where(cbParams, { 'name': 'module' }).length;
    }(), normalizeDependencyNames = {}, dependencyNames = function () {
      var deps = [], currentName;
      _.each(dependencies, function (currentDependency) {
        currentName = normalizeModuleName.call(amdclean, utils.normalizeDependencyName(moduleId, currentDependency), moduleId);
        normalizeDependencyNames[currentName] = true;
        deps.push({
          'type': 'Identifier',
          'name': currentName,
          'range': defaultRange,
          'loc': defaultLOC
        });
      });
      return deps;
    }(),
    // Makes sure the new name is not an existing callback function dependency and/or existing local variable
    findNewParamName = function findNewParamName(name) {
      name = '_' + name + '_';
      var containsLocalVariable = function () {
        var containsVariable = false;
        if (normalizeDependencyNames[name]) {
          containsVariable = true;
        } else {
          estraverse.traverse(callbackFunc, {
            'enter': function (node) {
              if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier' && node.id.name === name) {
                containsVariable = true;
              }
            }
          });
        }
        return containsVariable;
      }();
      // If there is not a local variable declaration with the passed name, return the name and surround it with underscores
      // Else if there is already a local variable declaration with the passed name, recursively add more underscores surrounding it
      if (!containsLocalVariable) {
        return name;
      } else {
        return findNewParamName(name);
      }
    }, matchingRequireExpressionNames = function () {
      var matchingNames = [];
      if (hasExportsParam) {
        estraverse.traverse(callbackFunc, {
          'enter': function (node) {
            var variableName, expressionName;
            if (node.type === 'VariableDeclarator' && utils.isRequireExpression(node.init)) {
              // If both variable name and expression names are there
              if (node.id && node.id.name && node.init && node.init['arguments'] && node.init['arguments'][0] && node.init['arguments'][0].value) {
                variableName = node.id.name;
                expressionName = normalizeModuleName.call(amdclean, utils.normalizeDependencyName(moduleId, node.init['arguments'][0].value, moduleId));
                if (!_.contains(ignoreModules, expressionName) && variableName === expressionName) {
                  matchingNames.push({
                    'originalName': expressionName,
                    'newName': findNewParamName(expressionName),
                    'range': node.range || defaultRange,
                    'loc': node.loc || defaultLOC
                  });
                }
              }
            }
          }
        });
      }
      return matchingNames;
    }(), matchingRequireExpressionParams = function () {
      var params = [];
      _.each(matchingRequireExpressionNames, function (currentParam) {
        params.push({
          'type': 'Identifier',
          'name': currentParam.newName ? currentParam.newName : currentParam,
          'range': currentParam.range,
          'loc': currentParam.loc
        });
      });
      return params;
    }(), callbackFuncParams = function () {
      var deps = [], currentName, cbParams = _.union(callbackFunc.params && callbackFunc.params.length ? callbackFunc.params : !shouldOptimize && dependencyNames && dependencyNames.length ? dependencyNames : [], matchingRequireExpressionParams), mappedParameter = {},
        // For calculating cbParams we'll optimize by removing not referenced names in the callback parameters. 
        // If the callback body contains a reference to 'arguments' then we cannot perform this optimization.
        // but at the same time if only inner functions body contains arguments WE DO optimize.
        // What we do is find inner function declarations and then remove their text from the callback body. Then we look for 'arguments' references
        innerFunctions = [], lookForArgumentsCode;
      if (callbackFunc.body) {
        estraverse.traverse(callbackFunc.body, {
          enter: function (node, parent) {
            if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration')
              innerFunctions.push(node);
          }
        });
        if (innerFunctions.length) {
          for (var i = callbackFunc.body.range[0]; i < callbackFunc.body.range[1]; i++) {
            _.each(innerFunctions, function (innerFunction) {
              if (i < innerFunction.range[0] || i >= innerFunction.range[1]) {
                lookForArgumentsCode += amdclean.options.code[i];
              }
            });
          }
        } else {
          lookForArgumentsCode = amdclean.options.code.substring(callbackFunc.body.range[0], callbackFunc.body.range[1]);
        }
        if (/[^\w0-9_]arguments[^\w0-9_]/.test(lookForArgumentsCode)) {
          cbParams = cbParams.concat(dependencyNames.slice(cbParams.length));
        }
      }
      _.each(cbParams, function (currentParam, iterator) {
        if (currentParam) {
          currentName = currentParam.name;
        } else {
          currentName = dependencyNames[iterator].name;
        }
        if (!shouldOptimize && currentName !== '{}') {
          deps.push({
            'type': 'Identifier',
            'name': currentName,
            'range': defaultRange,
            'loc': defaultLOC
          });
        } else if (currentName !== '{}' && (!hasExportsParam || defaultValues.dependencyBlacklist[currentName] !== 'remove')) {
          deps.push({
            'type': 'Identifier',
            'name': currentName,
            'range': defaultRange,
            'loc': defaultLOC
          });
          // If a callback parameter is not the exact name of a stored module and there is a dependency that matches the current callback parameter
          if (!isOptimized && aggressiveOptimizations === true && !amdclean.storedModules[currentName] && dependencyNames[iterator]) {
            // If the current dependency has not been stored
            if (!amdclean.callbackParameterMap[dependencyNames[iterator].name]) {
              amdclean.callbackParameterMap[dependencyNames[iterator].name] = [{
                  'name': currentName,
                  'count': 1
                }];
            } else {
              mappedParameter = _.where(amdclean.callbackParameterMap[dependencyNames[iterator].name], { 'name': currentName });
              if (mappedParameter.length) {
                mappedParameter = mappedParameter[0];
                mappedParameter.count += 1;
              } else {
                amdclean.callbackParameterMap[dependencyNames[iterator].name].push({
                  'name': currentName,
                  'count': 1
                });
              }
            }
          }
        }
      });
      originalCallbackFuncParams = deps;
      // Only return callback function parameters that do not directly match the name of existing stored modules
      return _.filter(deps || [], function (currentParam) {
        return aggressiveOptimizations === true && shouldOptimize ? !amdclean.storedModules[currentParam.name] : true;
      });
    }(), isCommonJS = !hasReturnStatement && hasExportsParam, hasExportsAssignment = exportsExpressions.length || moduleExportsExpressions.length, dependencyNameLength, callbackFuncParamsLength;
  // Only return dependency names that do not directly match the name of existing stored modules
  dependencyNames = _.filter(dependencyNames || [], function (currentDep, iterator) {
    var mappedCallbackParameter = originalCallbackFuncParams[iterator], currentDepName = currentDep.name;
    // If the matching callback parameter matches the name of a stored module, then do not return it
    // Else if the matching callback parameter does not match the name of a stored module, return the dependency
    return aggressiveOptimizations === true && shouldOptimize ? !mappedCallbackParameter || amdclean.storedModules[mappedCallbackParameter.name] && mappedCallbackParameter.name === currentDepName ? !amdclean.storedModules[currentDepName] : !amdclean.storedModules[mappedCallbackParameter.name] : true;
  });
  dependencyNames = _.map(dependencyNames || [], function (currentDep, iterator) {
    if (dependencyBlacklist[currentDep.name]) {
      currentDep.name = '{}';
    }
    return currentDep;
  });
  dependencyNameLength = dependencyNames.length;
  callbackFuncParamsLength = callbackFuncParams.length;
  // If the module dependencies passed into the current module are greater than the used callback function parameters, do not pass the dependencies
  if (dependencyNameLength > callbackFuncParamsLength) {
    dependencyNames.splice(callbackFuncParamsLength, dependencyNameLength - callbackFuncParamsLength);
  }
  // If it is a CommonJS module and there is an exports assignment, make sure to return the exports object
  if (isCommonJS && hasExportsAssignment) {
    callbackFunc.body.body.push({
      'type': 'ReturnStatement',
      'argument': {
        'type': 'Identifier',
        'name': 'exports',
        'range': defaultRange,
        'loc': defaultLOC
      },
      'range': defaultRange,
      'loc': defaultLOC
    });
  }
  // Makes sure to update all the local variable require expressions to any updated names
  estraverse.replace(callbackFunc, {
    'enter': function (node) {
      var normalizedModuleName, newName;
      if (utils.isRequireExpression(node)) {
        if (node['arguments'] && node['arguments'][0] && node['arguments'][0].value) {
          normalizedModuleName = normalizeModuleName.call(amdclean, utils.normalizeDependencyName(moduleId, node['arguments'][0].value, moduleId));
          if (_.contains(ignoreModules, normalizedModuleName)) {
            return node;
          }
          if (_.where(matchingRequireExpressionNames, { 'originalName': normalizedModuleName }).length) {
            newName = _.where(matchingRequireExpressionNames, { 'originalName': normalizedModuleName })[0].newName;
          }
          return {
            'type': 'Identifier',
            'name': newName ? newName : normalizedModuleName,
            'range': node.range || defaultRange,
            'loc': node.loc || defaultLOC
          };
        } else {
          return node;
        }
      }
    }
  });
  if (isDefine) {
    return convertToIIFEDeclaration.call(amdclean, {
      'moduleId': moduleId,
      'moduleName': moduleName,
      'dependencyNames': dependencyNames,
      'callbackFuncParams': callbackFuncParams,
      'hasModuleParam': hasModuleParam,
      'hasExportsParam': hasExportsParam,
      'callbackFunc': callbackFunc,
      'isOptimized': isOptimized,
      'node': node
    });
  } else if (isRequire) {
    return convertToIIFE.call(amdclean, {
      'dependencyNames': dependencyNames,
      'callbackFuncParams': callbackFuncParams,
      'callbackFunc': callbackFunc,
      'node': node
    });
  }
};
convertToObjectDeclaration = function (obj, type) {
  var node = obj.node, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = node.range || defaultRange, loc = node.loc || defaultLOC, moduleName = obj.moduleName, moduleReturnValue = function () {
      var modReturnValue, callee, params, returnStatement, nestedReturnStatement, internalFunctionExpression;
      if (type === 'functionCallExpression') {
        modReturnValue = obj.moduleReturnValue;
        callee = modReturnValue.callee;
        params = callee.params;
        if (params && params.length && _.isArray(params) && _.where(params, { 'name': 'global' })) {
          if (_.isObject(callee.body) && _.isArray(callee.body.body)) {
            returnStatement = _.where(callee.body.body, { 'type': 'ReturnStatement' })[0];
            if (_.isObject(returnStatement) && _.isObject(returnStatement.argument) && returnStatement.argument.type === 'FunctionExpression') {
              internalFunctionExpression = returnStatement.argument;
              if (_.isObject(internalFunctionExpression.body) && _.isArray(internalFunctionExpression.body.body)) {
                nestedReturnStatement = _.where(internalFunctionExpression.body.body, { 'type': 'ReturnStatement' })[0];
                if (_.isObject(nestedReturnStatement.argument) && _.isObject(nestedReturnStatement.argument.right) && _.isObject(nestedReturnStatement.argument.right.property)) {
                  if (nestedReturnStatement.argument.right.property.name) {
                    modReturnValue = {
                      'type': 'MemberExpression',
                      'computed': false,
                      'object': {
                        'type': 'Identifier',
                        'name': 'window',
                        'range': range,
                        'loc': loc
                      },
                      'property': {
                        'type': 'Identifier',
                        'name': nestedReturnStatement.argument.right.property.name,
                        'range': range,
                        'loc': loc
                      },
                      'range': range,
                      'loc': loc
                    };
                  }
                }
              }
            }
          }
        }
      }
      modReturnValue = modReturnValue || obj.moduleReturnValue;
      return modReturnValue;
    }(), updatedNode = {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'AssignmentExpression',
        'operator': '=',
        'left': {
          'type': 'Identifier',
          'name': moduleName,
          'range': range,
          'loc': loc
        },
        'right': moduleReturnValue,
        'range': range,
        'loc': loc
      },
      'range': range,
      'loc': loc
    };
  return updatedNode;
};
createAst = function createAst(providedCode) {
  var amdclean = this, options = amdclean.options, filePath = options.filePath, code = providedCode || options.code || (filePath ? utils.readFile(filePath) : ''), esprimaOptions = options.esprima, escodegenOptions = options.escodegen;
  if (!code) {
    throw new Error(errorMsgs.emptyCode);
  } else {
    if (!_.isPlainObject(esprima) || !_.isFunction(esprima.parse)) {
      throw new Error(errorMsgs.esprima);
    }
    var ast = esprima.parse(code, esprimaOptions);
    if (options.sourceMap)
      sourcemapToAst(ast, options.sourceMap);
    // Check if both the esprima and escodegen comment options are set to true
    if (esprimaOptions.comment === true && escodegenOptions.comment === true) {
      try {
        // Needed to keep source code comments when generating the code with escodegen
        ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
      } catch (e) {
      }
    }
    return ast;
  }
};
convertDefinesAndRequires = function convertDefinesAndRequires(node, parent) {
  var amdclean = this, options = amdclean.options, moduleName, args, dependencies, moduleReturnValue, moduleId, params, isDefine = utils.isDefine(node), isRequire = utils.isRequire(node), startLineNumber, callbackFuncArg = false, type = '', shouldBeIgnored, moduleToBeIgnored, parentHasFunctionExpressionArgument, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = node.range || defaultRange, loc = node.loc || defaultLOC, dependencyBlacklist = defaultValues.dependencyBlacklist, shouldOptimize;
  startLineNumber = isDefine || isRequire ? node.expression.loc.start.line : node && node.loc && node.loc.start ? node.loc.start.line : null;
  shouldBeIgnored = amdclean.matchingCommentLineNumbers[startLineNumber] || amdclean.matchingCommentLineNumbers[startLineNumber - 1];
  // If it is an AMD conditional statement
  // e.g. if(typeof define === 'function') {}
  if (utils.isAMDConditional(node)) {
    estraverse.traverse(node, {
      'enter': function (node) {
        var normalizedModuleName;
        if (utils.isDefine(node)) {
          if (node.expression && node.expression.arguments && node.expression.arguments.length) {
            // Add the module name to the ignore list
            if (node.expression.arguments[0].type === 'Literal' && node.expression.arguments[0].value) {
              normalizedModuleName = normalizeModuleName.call(amdclean, node.expression.arguments[0].value);
              if (options.transformAMDChecks !== true) {
                amdclean.conditionalModulesToIgnore[normalizedModuleName] = true;
              } else {
                amdclean.conditionalModulesToNotOptimize[normalizedModuleName] = true;
              }
              if (options.createAnonymousAMDModule === true) {
                amdclean.storedModules[normalizedModuleName] = false;
                node.expression.arguments.shift();
              }
            }
          }
        }
      }
    });
    // If the AMD conditional statement should be transformed and not ignored
    if (!shouldBeIgnored && options.transformAMDChecks === true) {
      // Transform the AMD conditional statement
      // e.g. if(typeof define === 'function') {} -> if(true) {}
      node.test = {
        'type': 'Literal',
        'value': true,
        'raw': 'true',
        'range': range,
        'loc': loc
      };
      return node;
    }
  }
  if (isDefine || isRequire) {
    args = Array.prototype.slice.call(node.expression['arguments'], 0);
    moduleReturnValue = isRequire ? args[1] : args[args.length - 1];
    moduleId = node.expression['arguments'][0].value;
    moduleName = normalizeModuleName.call(amdclean, moduleId);
    shouldOptimize = !amdclean.conditionalModulesToNotOptimize[moduleName];
    dependencies = function () {
      var deps = isRequire ? args[0] : args[args.length - 2], depNames = [], hasExportsParam;
      if (_.isPlainObject(deps)) {
        deps = deps.elements || [];
      } else {
        deps = [];
      }
      hasExportsParam = _.where(deps, { 'value': 'exports' }).length;
      if (_.isArray(deps) && deps.length) {
        _.each(deps, function (currentDependency) {
          if (dependencyBlacklist[currentDependency.value] && !shouldOptimize) {
            depNames.push(currentDependency.value);
          } else if (dependencyBlacklist[currentDependency.value] !== 'remove') {
            if (currentDependency.value === 'exports') {
              depNames.push(moduleName);
              amdclean.exportsModules[moduleName] = true;
            } else if (dependencyBlacklist[currentDependency.value]) {
              depNames.push('{}');
            } else {
              depNames.push(currentDependency.value);
            }
          } else {
            if (!hasExportsParam) {
              depNames.push('{}');
            }
          }
        });
      }
      return depNames;
    }();
    params = {
      'node': node,
      'moduleName': moduleName,
      'moduleId': moduleId,
      'dependencies': dependencies,
      'moduleReturnValue': moduleReturnValue,
      'isDefine': isDefine,
      'isRequire': isRequire,
      'range': range,
      'loc': loc,
      'shouldOptimize': shouldOptimize
    };
    if (isDefine) {
      if (shouldBeIgnored || !moduleName || amdclean.conditionalModulesToIgnore[moduleName] === true) {
        amdclean.options.ignoreModules.push(moduleName);
        return node;
      }
      if (_.contains(options.removeModules, moduleName)) {
        // Remove the current module from the source
        return { 'type': 'EmptyStatement' };
      }
      if (_.isObject(options.shimOverrides) && options.shimOverrides[moduleId]) {
        params.moduleReturnValue = createAst.call(amdclean, options.shimOverrides[moduleId]);
        if (_.isArray(params.moduleReturnValue.body) && _.isObject(params.moduleReturnValue.body[0])) {
          if (_.isObject(params.moduleReturnValue.body[0].expression)) {
            params.moduleReturnValue = params.moduleReturnValue.body[0].expression;
            type = 'objectExpression';
          }
        } else {
          params.moduleReturnValue = moduleReturnValue;
        }
      } else if (params.moduleReturnValue && params.moduleReturnValue.type === 'Identifier') {
        type = 'functionExpression';
      }
      if (_.contains(options.ignoreModules, moduleName)) {
        return node;
      } else if (utils.isFunctionExpression(moduleReturnValue) || type === 'functionExpression') {
        return convertToFunctionExpression.call(amdclean, params);
      } else if (utils.isObjectExpression(moduleReturnValue) || type === 'objectExpression') {
        return convertToObjectDeclaration.call(amdclean, params);
      } else if (utils.isFunctionCallExpression(moduleReturnValue)) {
        return convertToObjectDeclaration.call(amdclean, params, 'functionCallExpression');
      }
    } else if (isRequire) {
      if (shouldBeIgnored) {
        return node;
      }
      callbackFuncArg = _.isArray(node.expression['arguments']) && node.expression['arguments'].length ? node.expression['arguments'][1] && node.expression['arguments'][1].body && node.expression['arguments'][1].body.body && node.expression['arguments'][1].body.body.length : false;
      if (options.removeAllRequires !== true && callbackFuncArg) {
        return convertToFunctionExpression.call(amdclean, params);
      } else {
        // Remove the require include statement from the source
        return {
          'type': 'EmptyStatement',
          'range': range,
          'loc': loc
        };
      }
    }
  } else {
    // If the node is a function expression that has an exports parameter and does not return anything, return exports
    if (node.type === 'FunctionExpression' && _.isArray(node.params) && _.where(node.params, {
        'type': 'Identifier',
        'name': 'exports'
      }).length && _.isObject(node.body) && _.isArray(node.body.body) && !_.where(node.body.body, { 'type': 'ReturnStatement' }).length) {
      parentHasFunctionExpressionArgument = function () {
        if (!parent || !parent.arguments) {
          return false;
        }
        if (parent && parent.arguments && parent.arguments.length) {
          return _.where(parent.arguments, { 'type': 'FunctionExpression' }).length;
        }
        return false;
      }();
      if (parentHasFunctionExpressionArgument) {
        // Adds the logical expression, 'exports = exports || {}', to the beginning of the function expression
        node.body.body.unshift({
          'type': 'ExpressionStatement',
          'expression': {
            'type': 'AssignmentExpression',
            'operator': '=',
            'left': {
              'type': 'Identifier',
              'name': 'exports',
              'range': defaultRange,
              'loc': defaultLOC
            },
            'right': {
              'type': 'LogicalExpression',
              'operator': '||',
              'left': {
                'type': 'Identifier',
                'name': 'exports',
                'range': defaultRange,
                'loc': defaultLOC
              },
              'right': {
                'type': 'ObjectExpression',
                'properties': [],
                'range': defaultRange,
                'loc': defaultLOC
              },
              'range': defaultRange,
              'loc': defaultLOC
            },
            'range': defaultRange,
            'loc': defaultLOC
          },
          'range': defaultRange,
          'loc': defaultLOC
        });
      }
      // Adds the return statement, 'return exports', to the end of the function expression 
      node.body.body.push({
        'type': 'ReturnStatement',
        'argument': {
          'type': 'Identifier',
          'name': 'exports',
          'range': defaultRange,
          'loc': defaultLOC
        },
        'range': defaultRange,
        'loc': defaultLOC
      });
    }
    return node;
  }
};
traverseAndUpdateAst = function traverseAndUpdateAst(obj) {
  var amdclean = this, options = amdclean.options, ast = obj.ast;
  if (!_.isPlainObject(obj)) {
    throw new Error(errorMsgs.invalidObject('traverseAndUpdateAst'));
  }
  if (!ast) {
    throw new Error(errorMsgs.emptyAst('traverseAndUpdateAst'));
  }
  if (!_.isPlainObject(estraverse) || !_.isFunction(estraverse.replace)) {
    throw new Error(errorMsgs.estraverse);
  }
  estraverse.replace(ast, {
    'enter': function (node, parent) {
      var ignoreComments;
      if (node.type === 'Program') {
        ignoreComments = function () {
          var arr = [], currentLineNumber;
          amdclean.comments = node.comments;
          _.each(node.comments, function (currentComment) {
            var currentCommentValue = currentComment.value.trim();
            if (currentCommentValue === options.commentCleanName) {
              arr.push(currentComment);
            }
          });
          return arr;
        }();
        _.each(ignoreComments, function (currentComment) {
          currentLineNumber = currentComment.loc.start.line;
          amdclean.matchingCommentLineNumbers[currentLineNumber] = true;
        });
        return node;
      }
      return convertDefinesAndRequires.call(amdclean, node, parent);
    },
    'leave': function (node) {
      return node;
    }
  });
  return ast;
};
getNormalizedModuleName = function getNormalizedModuleName(node) {
  if (!utils.isDefine(node)) {
    return;
  }
  var amdclean = this, moduleId = node.expression['arguments'][0].value, moduleName = normalizeModuleName.call(amdclean, moduleId);
  return moduleName;
};
findAndStoreAllModuleIds = function findAndStoreAllModuleIds(ast) {
  var amdclean = this;
  if (!ast) {
    throw new Error(errorMsgs.emptyAst('findAndStoreAllModuleIds'));
  }
  if (!_.isPlainObject(estraverse) || !_.isFunction(estraverse.traverse)) {
    throw new Error(errorMsgs.estraverse);
  }
  estraverse.traverse(ast, {
    'enter': function (node, parent) {
      var moduleName = getNormalizedModuleName.call(amdclean, node, parent);
      // If the current module has not been stored, store it
      if (moduleName && !amdclean.storedModules[moduleName]) {
        amdclean.storedModules[moduleName] = true;
      }
      // If it is a return statement that returns a define() method call, strip the return statement
      if (node.type === 'ReturnStatement' && node.argument && node.argument.callee && node.argument.callee.name === 'define') {
        node.type = 'ExpressionStatement';
        node.expression = node.argument;
        delete node.argument;
      }
    }
  });
};
generateCode = function generateCode(ast) {
  var amdclean = this, options = amdclean.options, escodegenOptions = options.escodegen || {};
  if (!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
    throw new Error(errorMsgs.escodegen);
  }
  return escodegen.generate(ast, escodegenOptions);
};
clean = function clean() {
  var amdclean = this, options = amdclean.options, ignoreModules = options.ignoreModules, originalAst = {}, ast = {}, configAst = {}, generatedCode, declarations = [], hoistedVariables = {}, hoistedCallbackParameters = {}, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC;
  // Permit ignoreModules to contain module ids (using '/' rather than '_')
  if (options.ignoreModules !== undefined) {
    options.ignoreModules = options.ignoreModules.map(function (name) {
      return normalizeModuleName.call(amdclean, name);
    });
  }
  // Creates and stores an AST representation of the code
  originalAst = createAst.call(amdclean);
  // Loops through the AST, finds all module ids, and stores them in the current instance storedModules property
  findAndStoreAllModuleIds.call(amdclean, originalAst);
  // Traverses the AST and removes any AMD trace
  ast = traverseAndUpdateAst.call(amdclean, { ast: originalAst });
  // Post Clean Up
  // Removes all empty statements from the source so that there are no single semicolons and
  // Makes sure that all require() CommonJS calls are converted
  // And all aggressive optimizations (if the option is turned on) are handled
  if (ast && _.isArray(ast.body)) {
    estraverse.replace(ast, {
      enter: function (node, parent) {
        var normalizedModuleName, assignmentName = node && node.left && node.left.name ? node.left.name : '', cb = node.right, assignmentNodes = [], assignments = {}, mappedParameters = _.filter(amdclean.callbackParameterMap[assignmentName], function (currentParameter) {
            return currentParameter && currentParameter.count > 1;
          }), mappedCbDependencyNames, mappedCbParameterNames, paramsToRemove = [];
        if (node === undefined || node.type === 'EmptyStatement') {
          _.each(parent.body, function (currentNode, iterator) {
            if (currentNode === undefined || currentNode.type === 'EmptyStatement') {
              parent.body.splice(iterator, 1);
            }
          });
        } else if (utils.isRequireExpression(node)) {
          if (node['arguments'] && node['arguments'][0] && node['arguments'][0].value) {
            normalizedModuleName = normalizeModuleName.call(amdclean, node['arguments'][0].value);
            if (ignoreModules.indexOf(normalizedModuleName) === -1) {
              return {
                'type': 'Identifier',
                'name': normalizedModuleName,
                'range': node.range || defaultRange,
                'loc': node.loc || defaultLOC
              };
            } else {
              return node;
            }
          } else {
            return node;
          }
        } else if (options.aggressiveOptimizations === true && node.type === 'AssignmentExpression' && assignmentName) {
          // The names of all of the current callback function parameters
          mappedCbParameterNames = _.map(cb && cb.callee && cb.callee.params ? cb.callee.params : [], function (currentParam) {
            return currentParam.name;
          });
          // The names of all of the current callback function dependencies
          mappedCbDependencyNames = _.map(cb.arguments, function (currentArg) {
            return currentArg.name;
          });
          // Loop through the dependency names
          _.each(mappedCbDependencyNames, function (currentDependencyName) {
            // Nested loop to see if any of the dependency names map to a callback parameter
            _.each(amdclean.callbackParameterMap[currentDependencyName], function (currentMapping) {
              var mappedName = currentMapping.name, mappedCount = currentMapping.count;
              // Loops through all of the callback function parameter names to see if any of the parameters should be removed
              _.each(mappedCbParameterNames, function (currentParameterName, iterator) {
                if (mappedCount > 1 && mappedName === currentParameterName) {
                  paramsToRemove.push(iterator);
                }
              });
            });
          });
          _.each(paramsToRemove, function (currentParam) {
            cb.arguments.splice(currentParam, currentParam + 1);
            cb.callee.params.splice(currentParam, currentParam + 1);
          });
          // If the current Assignment Expression is a mapped callback parameter
          if (amdclean.callbackParameterMap[assignmentName]) {
            node.right = function () {
              // If aggressive optimizations are turned on, the mapped parameter is used more than once, and there are mapped dependencies to be removed
              if (options.aggressiveOptimizations === true && mappedParameters.length) {
                // All of the necessary assignment nodes
                assignmentNodes = _.map(mappedParameters, function (currentDependency, iterator) {
                  return {
                    'type': 'AssignmentExpression',
                    'operator': '=',
                    'left': {
                      'type': 'Identifier',
                      'name': currentDependency.name,
                      'range': defaultRange,
                      'loc': defaultLOC
                    },
                    'right': iterator < mappedParameters.length - 1 ? {
                      'range': defaultRange,
                      'loc': defaultLOC
                    } : cb,
                    'range': defaultRange,
                    'loc': defaultLOC
                  };
                });
                // Creates an object containing all of the assignment expressions
                assignments = _.reduce(assignmentNodes, function (result, assignment) {
                  result.right = assignment;
                  return result;
                });
                // The constructed assignment object node
                return assignmentNodes.length ? assignments : cb;
              } else {
                return cb;
              }
            }();
            return node;
          }
        }
      }
    });
  }
  // Makes any necessary modules global by appending a global instantiation to the code
  // eg: window.exampleModule = exampleModule;
  if (_.isArray(options.globalModules)) {
    _.each(options.globalModules, function (currentModule) {
      if (_.isString(currentModule) && currentModule.length) {
        ast.body.push({
          'type': 'ExpressionStatement',
          'expression': {
            'type': 'AssignmentExpression',
            'operator': '=',
            'left': {
              'type': 'MemberExpression',
              'computed': false,
              'object': {
                'type': 'Identifier',
                'name': 'window',
                'range': defaultRange,
                'loc': defaultLOC
              },
              'property': {
                'type': 'Identifier',
                'name': currentModule,
                'range': defaultRange,
                'loc': defaultLOC
              },
              'range': defaultRange,
              'loc': defaultLOC
            },
            'right': {
              'type': 'Identifier',
              'name': currentModule,
              'range': defaultRange,
              'loc': defaultLOC
            },
            'range': defaultRange,
            'loc': defaultLOC
          },
          'range': defaultRange,
          'loc': defaultLOC
        });
      }
    });
  }
  hoistedCallbackParameters = function () {
    var obj = {}, callbackParameterMap = amdclean.callbackParameterMap, currentParameterName;
    _.each(callbackParameterMap, function (mappedParameters) {
      _.each(mappedParameters, function (currentParameter) {
        if (currentParameter.count > 1) {
          currentParameterName = currentParameter.name;
          obj[currentParameterName] = true;
        }
      });
    });
    return obj;
  }();
  // Hoists all modules and necessary callback parameters
  hoistedVariables = _.merge(_.cloneDeep(_.reduce(amdclean.storedModules, function (storedModules, key, val) {
    if (key !== false) {
      storedModules[val] = true;
    }
    return storedModules;
  }, {})), hoistedCallbackParameters);
  // Creates variable declarations for each AMD module/callback parameter that needs to be hoisted
  _.each(hoistedVariables, function (moduleValue, moduleName) {
    if (!_.contains(options.ignoreModules, moduleName)) {
      var _initValue = amdclean.exportsModules[moduleName] !== true ? null : {
        type: 'ObjectExpression',
        properties: []
      };
      declarations.push({
        'type': 'VariableDeclarator',
        'id': {
          'type': 'Identifier',
          'name': moduleName,
          'range': defaultRange,
          'loc': defaultLOC
        },
        'init': _initValue,
        'range': defaultRange,
        'loc': defaultLOC
      });
    }
  });
  // Adds a local modules variable if a user wants local module information available to them
  if (_.isObject(options.config) && !_.isEmpty(options.config)) {
    configAst = function () {
      var props = [];
      _.each(options.config, function (val, key) {
        var currentModuleConfig = options.config[key];
        props.push({
          'type': 'Property',
          'key': {
            'type': 'Literal',
            'value': key
          },
          'value': {
            'type': 'ObjectExpression',
            'properties': [{
                'type': 'Property',
                'key': {
                  'type': 'Literal',
                  'value': 'config'
                },
                'value': {
                  'type': 'FunctionExpression',
                  'id': null,
                  'params': [],
                  'defaults': [],
                  'body': {
                    'type': 'BlockStatement',
                    'body': [{
                        'type': 'ReturnStatement',
                        'argument': createAst.call(amdclean, 'var x =' + JSON.stringify(currentModuleConfig)).body[0].declarations[0].init
                      }]
                  }
                },
                'kind': 'init'
              }]
          }
        });
      });
      return {
        'type': 'VariableDeclarator',
        'id': {
          'type': 'Identifier',
          'name': 'modules'
        },
        'init': {
          'type': 'ObjectExpression',
          'properties': props
        }
      };
    }();
    declarations.push(configAst);
  }
  // If there are declarations, the declarations are preprended to the beginning of the code block
  if (declarations.length) {
    ast.body.unshift({
      'type': 'VariableDeclaration',
      'declarations': declarations,
      'kind': 'var',
      'range': defaultRange,
      'loc': defaultLOC
    });
  }
  // Converts the updated AST to a string of code
  generatedCode = generateCode.call(amdclean, ast);
  // If there is a wrap option specified
  if (_.isObject(options.wrap)) {
    if (_.isString(options.wrap.start) && options.wrap.start.length) {
      generatedCode = options.wrap.start + generatedCode;
    }
    if (_.isString(options.wrap.end) && options.wrap.end.length) {
      generatedCode = generatedCode + options.wrap.end;
    }
  }
  return generatedCode;
};
(function () {
  (function (root, factory, undefined) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, and plain browser loading
    if (typeof define === 'function' && define.amd) {
      factory.amd = true;
      define([
        'esprima',
        'estraverse',
        'escodegen',
        'underscore',
        'sourcemap-to-ast'
      ], function (esprima, estraverse, escodegen, underscore, sourcemapToAst) {
        return factory({
          'esprima': esprima,
          'estraverse': estraverse,
          'escodegen': escodegen,
          'underscore': underscore,
          'sourcemapToAst': sourcemapToAst
        }, root);
      });
    } else if (typeof exports !== 'undefined') {
      factory.commonjs = true;
      module.exports = factory(null, root);
    } else {
      root.amdclean = factory(null, root);
    }
  }(this, function cleanamd(amdDependencies, context) {
    'use strict';
    // Third-Party Dependencies
    // Note: These dependencies are hoisted to the top (as local variables) at build time (Look in the gulpfile.js file and the AMDclean wrap option for more details)
    sourcemapToAst = function () {
      if (cleanamd.amd && amdDependencies && amdDependencies.sourcemapToAst) {
        return amdDependencies.sourcemapToAst;
      } else if (cleanamd.commonjs) {
        return require('sourcemap-to-ast');
      } else if (context && context.sourcemapToAst) {
        return context.sourcemapToAst;
      }
    }();
    // Third-Party Dependencies
    // Note: These dependencies are hoisted to the top (as local variables) at build time (Look in the gulpfile.js file and the AMDclean wrap option for more details)
    esprima = function () {
      if (cleanamd.amd && amdDependencies && amdDependencies.esprima && amdDependencies.esprima.parse) {
        return amdDependencies.esprima;
      } else if (cleanamd.commonjs) {
        return require('esprima');
      } else if (context && context.esprima && context.esprima.parse) {
        return context.esprima;
      }
    }();
    estraverse = function () {
      if (cleanamd.amd && amdDependencies && amdDependencies.estraverse && amdDependencies.estraverse.traverse) {
        return amdDependencies.estraverse;
      } else if (cleanamd.commonjs) {
        return require('estraverse');
      } else if (context && context.estraverse && context.estraverse.traverse) {
        return context.estraverse;
      }
    }();
    escodegen = function () {
      if (cleanamd.amd && amdDependencies && amdDependencies.escodegen && amdDependencies.escodegen.generate) {
        return amdDependencies.escodegen;
      } else if (cleanamd.commonjs) {
        return require('escodegen');
      } else if (context && context.escodegen && context.escodegen.generate) {
        return context.escodegen;
      }
    }();
    _ = function () {
      if (cleanamd.amd && amdDependencies && (amdDependencies.underscore || amdDependencies.lodash || amdDependencies._)) {
        return amdDependencies.underscore || amdDependencies.lodash || amdDependencies._;
      } else if (cleanamd.commonjs) {
        return require('lodash');
      } else if (context && context._) {
        return context._;
      }
    }();
    // AMDclean constructor function
    var AMDclean = function (options, overloadedOptions) {
        if (!esprima) {
          throw new Error(errorMsgs.esprima);
        } else if (!estraverse) {
          throw new Error(errorMsgs.estraverse);
        } else if (!escodegen) {
          throw new Error(errorMsgs.escodegen);
        } else if (!_) {
          throw new Error(errorMsgs.lodash);
        } else if (!sourcemapToAst && typeof window === 'undefined') {
          throw new Error(errorMsgs.sourcemapToAst);
        }
        var defaultOptions = _.cloneDeep(this.defaultOptions || {}), userOptions = options || overloadedOptions || {};
        if (!_.isPlainObject(options) && _.isString(options)) {
          userOptions = _.merge({ 'code': options }, _.isObject(overloadedOptions) ? overloadedOptions : {});
        }
        // storedModules
        // -------------
        // An object that will store all of the user module names
        this.storedModules = {};
        // originalAst
        // -----------
        // The original AST (Abstract Syntax Tree) before it is transformed
        this.originalAst = {};
        // callbackParameterMap
        // --------------------
        // An object that will store all of the user module callback parameters (that are used and also do not match the exact name of the dependencies they are representing) and the dependencies that they map to
        this.callbackParameterMap = {};
        // conditionalModulesToIgnore
        // --------------------------
        // An object that will store any modules that should be ignored (not cleaned)
        this.conditionalModulesToIgnore = {};
        // conditionalModulesToNotOptimize
        // -------------------------------
        // An object that will store any modules that should not be optimized (but still cleaned)
        this.conditionalModulesToNotOptimize = {};
        // matchingCommentLineNumbers
        // --------------------------
        // An object that stores any comments that match the commentCleanName option
        this.matchingCommentLineNumbers = {};
        // comments
        // --------
        // All of the stored program comments
        this.comments = [];
        // exportsModules
        // --------
        // An object that stores a map of all modules that makes use of the exports parameter in define. Useful when declaring variables and making sure circular dependencies work correctly.
        this.exportsModules = {};
        // options
        // -------
        // Merged user options and default options
        this.options = _.merge(defaultOptions, userOptions);
      },
      // The object that is publicly accessible
      publicAPI = {
        // Current project version number
        'VERSION': '2.7.0',
        'clean': function (options, overloadedOptions) {
          // Creates a new AMDclean instance
          var amdclean = new AMDclean(options, overloadedOptions), cleanedCode = amdclean.clean();
          // returns the cleaned code
          return cleanedCode;
        }
      };
    // AMDclean prototype object
    AMDclean.prototype = {
      // clean
      // -----
      // Creates an AST using Esprima, traverse and updates the AST using Estraverse, and generates standard JavaScript using Escodegen.
      'clean': clean,
      // defaultOptions
      // --------------
      // Environment - either node or web
      'defaultOptions': defaultOptions
    };
    return publicAPI;
  }));
}());}(typeof esprima !== "undefined" ? esprima: null, typeof estraverse !== "undefined" ? estraverse: null, typeof escodegen !== "undefined" ? escodegen: null, typeof _ !== "undefined" ? _ : null, typeof sourcemapToAst !== "undefined" ? sourcemapToAst : null));