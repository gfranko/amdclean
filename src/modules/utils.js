// Utils.js
// ========
// Abstract Syntax Tree (AST) and other helper utility methods

define([
  'errorMsgs',
  'defaultValues'
], function(
  errorMsgs,
  defaultValues
) {
  var Utils = {

    // isDefine
    // --------
    // Returns if the current AST node is a define() method call
    'isDefine': function(node, parent) {
      return Utils.isDefineAsExpressionStatement(node) || Utils.isDefineAsExpression(node, parent);
    },

    // isRequire
    // ---------
    // Returns if the current AST node is a require() method call
    'isRequire': function(node) {
     var expression = node.expression || {},
       callee = expression.callee;

     return (node &&
       node.type === 'ExpressionStatement' &&
       expression &&
       expression.type === 'CallExpression' &&
       callee.type === 'Identifier' &&
       callee.name === 'require');
    },

    'isDefineAsExpressionStatement':function(node){
      var expression = node.expression || {},
        callee = expression.callee;

      var isDefine = (_.isObject(node) &&
        node.type === 'ExpressionStatement' &&
        expression &&
        expression.type === 'CallExpression' &&
        callee.type === 'Identifier' &&
        callee.name === 'define');
      if(isDefine){
        return {
          expression:node.expression,
          isStatement: true
        };
      }
    },

    'isDefineAsExpression':function(node, parent){
      if(parent && Utils.isDefineAsExpressionStatement(parent)){
        return false;
      }
      var isDefine = (node &&
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'define');
      if(isDefine){
        return {
          expression:node
        };
      }
    },

    // isModuleExports
    // ---------------
    // Is a module.exports member expression
    'isModuleExports': function(node) {
      if (!node) {
        return false;
      }

      return (node.type === 'AssignmentExpression' &&
        node.left &&
        node.left.type === 'MemberExpression' &&
        node.left.object &&
        node.left.object.type === 'Identifier' &&
        node.left.object.name === 'module' &&
        node.left.property &&
        node.left.property.type === 'Identifier' &&
        node.left.property.name === 'exports');
    },

    // isRequireExpression
    // -------------------
    // Returns if the current AST node is a require() call expression
    // e.g. var example = require('someModule');
    'isRequireExpression': function(node) {
      return (node &&
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.name === 'require');
    },

    // isObjectExpression
    // ------------------
    // Returns if the current AST node is an object literal
    'isObjectExpression': function(expression) {
      return (expression &&
        expression &&
        expression.type === 'ObjectExpression');
    },

    // isFunctionExpression
    // --------------------
    // Returns if the current AST node is a function
    'isFunctionExpression': function(expression) {
      return (expression &&
        expression &&
        expression.type === 'FunctionExpression');
    },

    // isFunctionCallExpression
    // ------------------------
    // Returns if the current AST node is a function call expression
    'isFunctionCallExpression': function(expression) {
      return (expression &&
        expression &&
        expression.type === 'CallExpression' &&
        expression.callee &&
        expression.callee.type === 'FunctionExpression');
    },

    // isUseStrict
    // -----------
    // Returns if the current AST node is a 'use strict' expression
    // e.g. 'use strict'
    'isUseStrict': function(expression) {
      return (expression &&
        expression &&
        expression.value === 'use strict' &&
        expression.type === 'Literal');
    },

    // isIfStatement
    // -------------
    // Returns if the current AST node is an if statement
    // e.g. if(true) {}
    'isIfStatement': function(node) {
      return (node &&
        (node.type === 'IfStatement' || node.type == 'ConditionalExpression') &&
        node.test);
    },

    // isAMDConditional
    // ----------------
    // Returns if the current AST node is an if statement AMD check
    // e.g. if(typeof define === 'function') {}
    'isAMDConditional': function(node) {
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
        },
        reversedMatchObject = {
          'left': matchObject.right,
          'right': matchObject.left
        };

      try {
        return (_.find(node.test, matchObject) ||
          _.find([node.test], matchObject) ||
          _.find(node.test, reversedMatchObject) ||
          _.find([node.test], reversedMatchObject) ||
          _.find(node.test.left || {}, matchObject) ||
          _.find([node.test.left || {}], matchObject) ||
          _.find(node.test.left || {}, reversedMatchObject) ||
          _.find([node.test.left || {}], reversedMatchObject));
      } catch (e) {
        return false;
      }
    },

    // returnExpressionIdentifier
    // --------------------------
    // Returns a single identifier
    // e.g. module
    'returnExpressionIdentifier': function(name) {
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
    'readFile': function(path) {
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
    'isRelativeFilePath': function(path) {
      var segments = path.split('/');

      return segments.length !== -1 && (segments[0] === '.' || segments[0] === '..');
    },

    // convertToCamelCase
    // ------------------
    // Converts a delimited string to camel case
    // e.g. some_str -> someStr
    convertToCamelCase: function(input, delimiter) {
      delimiter = delimiter || '_';

      return input.replace(new RegExp(delimiter + '(.)', 'g'), function(match, group1) {
        return group1.toUpperCase();
      });
    },

    // prefixReservedWords
    // -------------------
    // Converts a reserved word in JavaScript with an underscore
    // e.g. class -> _class
    'prefixReservedWords': function(name) {
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
    'normalizeDependencyName': function(moduleId, dep) {
      if (!moduleId || !dep) {
        return dep;
      }

      var pluginName = (function(){
          if (!dep || dep.indexOf("!") === -1) {
            return "";
          }

          var split = dep.split("!");
              dep = split[1];

          return split[0] + "!";

        }()),
        normalizePath = function(path) {
          var segments = path.split('/'),
            normalizedSegments;

          normalizedSegments = _.reduce(segments, function(memo, segment) {
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
        },
        baseName = function(path) {
          var segments = path.split('/');

          segments.pop();
          return segments.join('/');
        };

      if (!Utils.isRelativeFilePath(dep)) {
        return pluginName + dep;
      }

      return pluginName + normalizePath([baseName(moduleId), dep].join('/'));
    }
  };

  return Utils;
});