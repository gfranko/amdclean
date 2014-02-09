/*! amdclean - v0.6.2 - 2014-01-26
* http://gregfranko.com/amdclean
* Copyright (c) 2014 Greg Franko; Licensed MIT*/

(function (root, factory, undefined) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, and plain browser loading
    if (typeof define === 'function' && define.amd) {
        if(typeof exports !== 'undefined') {
            factory.env = 'node';
        } else {
            factory.env = 'web';
        }
        factory.amd = true;
        define(['esprima', 'estraverse', 'escodegen', 'underscore'], function(esprima, estraverse, escodegen, underscore) {
            return factory({ 'esprima': esprima, 'estraverse': estraverse, 'escodegen': escodegen, 'underscore': underscore });
        });
    } else if (typeof exports !== 'undefined') {
        factory.env = 'node';
        factory();
    } else {
        factory.env = 'web';
        root.amdclean = factory();
    }
}(this, function cleanamd(amdDependencies) {
    // Environment - either node or web
    var codeEnv = cleanamd.env,
        // Third-Party Dependencies
        esprima = cleanamd.amd ? amdDependencies.esprima : codeEnv === 'node' ? require('esprima') : window.esprima,
        estraverse = cleanamd.amd ? amdDependencies.estraverse : codeEnv === 'node' ? require('estraverse'): window.estraverse,
        escodegen = cleanamd.amd ? amdDependencies.escodegen && amdDependencies.escodegen.generate ? amdDependencies.escodegen : codeEnv === 'node' ? require('escodegen') : window.escodegen : require('escodegen'),
        _ = cleanamd.amd ? amdDependencies.underscore : codeEnv === 'node' ? require('lodash'): window._,
        fs = codeEnv === 'node' ? require('fs'): {}, // End Third-Party Dependencies
        // The Public API object
        publicAPI = {
            // Current project version number
            'VERSION': '0.6.2',
            // Default Options
            'defaultOptions': {
                'globalObject': false,
                'globalObjectName': 'amdclean',
                'rememberGlobalObject': true,
                'removeAllRequires': false,
                'ignoreModules': [],
                'escodegen': {
                    'comment': true
                },
                'esprima': {
                    'comment': true,
                    'loc': true,
                    'range': true,
                    'tokens': true
                },
                'globalModules': [],
                'commentCleanName': 'amdclean',
                'shimOverrides': {}
            },
            // Environment - either node or web
            'env': codeEnv,
            // All of the error messages presented to users
            'errorMsgs': {
                // The user has not supplied the cliean method with any code
                'emptyCode': 'There is no code to generate the AST with',
                // An AST has not been correctly returned by Esprima
                'emptyAst': function(methodName) {
                    return 'An AST is not being passed to the ' + methodName + '() method';
                },
                // A parameter is not an object literal (which is expected)
                'invalidObject': function(methodName) {
                    return 'An object is not being passed as the first parameter to the ' + methodName + '() method';
                },
                // Third-party dependencies have not been included on the page
                'lodash': 'There is not an _.isPlainObject() method.  Make sure you have included lodash (https://github.com/lodash/lodash).',
                'esprima': 'There is not an esprima.parse() method.  Make sure you have included esprima (https://github.com/ariya/esprima).',
                'estraverse': 'There is not an estraverse.replace() method.  Make sure you have included estraverse (https://github.com/Constellation/estraverse).',
                'escodegen': 'There is not an escodegen.generate() method.  Make sure you have included escodegen (https://github.com/Constellation/escodegen).'
            },
            // Dependency blacklist
            // --------------------
            //  Variable names that are not allowed as dependencies to functions
            'dependencyBlacklist': {
                'require': true,
                'exports': true,
                'module': true
            },
            // readFile
            // --------
            //  Synchronous file reading for node
            'readFile': function(path) {
                if(publicAPI.env !== 'node') {
                    return '';
                }
                return fs.readFileSync(path, 'utf8');
            },
            // isDefine
            // --------
            //  Returns if the current AST node is a define() method call
            'isDefine': function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return (_.isObject(node) &&
                    node.type === 'ExpressionStatement' &&
                    _.isObject(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'define');
            },
            // isRequire
            // ---------
            //  Returns if the current AST node is a require() method call
            'isRequire': function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return (_.isObject(node) &&
                    node.type === 'ExpressionStatement' &&
                    _.isObject(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'require');
            },
            // isRequireExpression
            // -------------------
            //  Returns if the current AST node is a require() call expression
            //  e.g. var example = require('someModule');
            'isRequireExpression': function(node) {
                return (node.type === 'CallExpression' &&
                    node.callee &&
                    node.callee.name === 'require');
            },
            // isObjectExpression
            // ------------------
            //  Returns if the current AST node is an object literal
            'isObjectExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'ObjectExpression');
            },
            // isFunctionExpression
            // --------------------
            //  Returns if the current AST node is a function
            'isFunctionExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'FunctionExpression');
            },
            // isFunctionCallExpression
            // ------------------------
            //  Returns if the current AST node is a function call expression
            'isFunctionCallExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'CallExpression' &&
                    _.isPlainObject(expression.callee) &&
                    expression.callee.type === 'FunctionExpression');
            },
            // isUseStrict
            // -----------
            //  Returns if the current AST node is a 'use strict' expression
            //  e.g. 'use strict'
            'isUseStrict': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'Literal' &&
                    expression.value === 'use strict');
            },
            // isAMDConditional
            // ----------------
            //  Returns if the current AST node is an if statement AMD check
            //  e.g. if(typeof define === 'function') {}
            'isAMDConditional': function(node) {
                if(node && node.type !== 'IfStatement' ||
                    !_.isObject(node.test) ||
                    !_.isObject(node.test.left) ||
                    _.isNull(node.test.left.value)) {
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
                };
                return (_.where(node.test, matchObject).length ||
                    _.where([node.test], matchObject).length ||
                    _.where(node.test.left, matchObject).length ||
                    _.where([node.test.left], matchObject).length);
            },
            // getJavaScriptIdentifier
            'prefixReservedWords': function(name) {
                var reservedWord = false;
                try {
                    if(name.length) {
                        eval('var ' + name + ' = 1;');
                    }
                } catch (e) {
                  reservedWord = true;
                }
                if(reservedWord === true) {
                    return '_' + name;
                } else {
                    return name;
                }
            },
            // normalizeModuleName
            // -------------------
            //  Returns a normalized module name (removes relative file path urls)
            'normalizeModuleName': function(name) {
                name = name || '';
                if(name === '{}') {
                    return name;
                }
                var normalized = name.replace(/\./g,'').replace(/[^A-Za-z0-9_$]/g,'_').replace(/^_+/,'');
                return publicAPI.prefixReservedWords(normalized);
            },
            // returnExpressionIdentifier
            // --------------------------
            //  Returns a single identifier
            //  e.g. module
            'returnExpressionIdentifier': function(name) {
                return {
                    'type': 'ExpressionStatement',
                    'expression': {
                        'type': 'Identifier',
                        'name': name
                    }
                };
            },
            // convertToObjectDeclaration
            // --------------------------
            //  Returns an object variable declaration
            //  e.g. var example = { exampleProp: true }
            'convertToObjectDeclaration': function(obj, type) {
                var node = obj.node,
                    moduleName  = obj.moduleName,
                    moduleReturnValue = (function() {
                        var modReturnValue,
                            callee,
                            params,
                            returnStatement,
                            nestedReturnStatement,
                            internalFunctionExpression;
                        if(type === 'functionCallExpression') {
                            modReturnValue = obj.moduleReturnValue;
                            callee = modReturnValue.callee;
                            params = callee.params;
                            if(params && params.length && _.isArray(params) && _.where(params, { 'name': 'global' })) {
                                if(_.isObject(callee.body)) {
                                    if(_.isArray(callee.body.body)) {
                                        returnStatement = _.where(callee.body.body, { 'type': 'ReturnStatement' })[0];
                                        if(_.isObject(returnStatement) && _.isObject(returnStatement.argument) && returnStatement.argument.type === 'FunctionExpression') {
                                            internalFunctionExpression = returnStatement.argument;
                                            if(_.isObject(internalFunctionExpression.body) && _.isArray(internalFunctionExpression.body.body)) {
                                                nestedReturnStatement = _.where(internalFunctionExpression.body.body, { 'type': 'ReturnStatement' })[0];
                                                if(_.isObject(nestedReturnStatement.argument) && _.isObject(nestedReturnStatement.argument.right) && _.isObject(nestedReturnStatement.argument.right.property)) {
                                                    if(nestedReturnStatement.argument.right.property.name) {
                                                        modReturnValue = {
                                                            'type': 'MemberExpression',
                                                            'computed': false,
                                                            'object': {
                                                                'type': 'Identifier',
                                                                'name': 'window'
                                                            },
                                                            'property': {
                                                                'type': 'Identifier',
                                                                'name': nestedReturnStatement.argument.right.property.name
                                                            }
                                                        };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        modReturnValue = modReturnValue || obj.moduleReturnValue;
                        return modReturnValue;
                    }()),
                    options = publicAPI.options,
                    updatedNode = (function() {
                        if(options.globalObject === true && options.globalObjectName) {
                            return {
                                'type': 'ExpressionStatement',
                                'expression': {
                                    'type': 'AssignmentExpression',
                                    'operator': '=',
                                    'left': {
                                        'type': 'MemberExpression',
                                        'computed': true,
                                        'object': {
                                            'type': 'Identifier',
                                            'name': options.globalObjectName
                                        },
                                        'property': {
                                            'type': 'Literal',
                                            'value': moduleName,
                                            'raw': "" + moduleName + ""
                                        }
                                    },
                                    "right": moduleReturnValue
                                }
                            };
                        } else {
                            return {
                                'type': 'VariableDeclaration',
                                'declarations': [
                                    {
                                        'type': 'VariableDeclarator',
                                        'id': {
                                            'type': 'Identifier',
                                            'name': moduleName
                                        },
                                        'init': moduleReturnValue
                                    }
                                ],
                                'kind': 'var'
                            };
                        }
                    }());
                    return updatedNode;
            },
            // convertToIIFE
            // -------------
            //  Returns an IIFE
            //  e.g. (function() { }())
            'convertToIIFE': function(obj) {
                var callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc,
                    dependencyNames = obj.dependencyNames;

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
                            'expression': callbackFunc.expression
                        },
                        'arguments': dependencyNames
                    }
                };
            },
            // convertToIIFEDeclaration
            // ------------------------
            //  Returns a function expression that is executed immediately
            //  e.g. var example = function(){}()
            'convertToIIFEDeclaration': function(obj) {
                var moduleName = obj.moduleName,
                    callbackFuncParams = obj.callbackFuncParams,
                    isOptimized = obj.isOptimized,
                    callbackFunc = (function() {
                        var cbFunc = obj.callbackFunc;
                        if(cbFunc.type === 'Identifier') {
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
                                                'type': 'CallExpression',
                                                'callee': {
                                                    'type': 'Identifier',
                                                    'name': cbFunc.name
                                                },
                                                'arguments': []
                                            }
                                    }],
                                },
                                'rest': null,
                                'generator': false,
                                'expression': false
                            };
                        }
                        return cbFunc;
                    }()),
                    dependencyNames = obj.dependencyNames,
                    options = publicAPI.options,
                    cb = (function() {
                        if(callbackFunc.type === 'Literal' || isOptimized === true) {
                            return callbackFunc;
                        } else {
                            return {
                                'type': 'CallExpression',
                                'callee': {
                                    'type': 'FunctionExpression',
                                    'id': {
                                        'type': 'Identifier',
                                        'name': ''
                                    },
                                    'params': callbackFuncParams,
                                    'defaults': [],
                                    'body': callbackFunc.body,
                                    'rest': callbackFunc.rest,
                                    'generator': callbackFunc.generator,
                                    'expression': callbackFunc.expression
                                },
                                'arguments': dependencyNames
                            }
                        }
                    }()),
                    updatedNode = (function() {
                        if(options.globalObject === true && options.globalObjectName) {
                            return {
                                'type': 'ExpressionStatement',
                                'expression': {
                                    'type': 'AssignmentExpression',
                                    'operator': '=',
                                    'left': {
                                        'type': 'MemberExpression',
                                        'computed': true,
                                        'object': {
                                            'type': 'Identifier',
                                            'name': options.globalObjectName
                                        },
                                        'property': {
                                            'type': 'Literal',
                                            'value': moduleName,
                                            'raw': "" + moduleName + ""
                                        }
                                    },
                                    'right': cb
                                }
                            };
                        } else {
                            return {
                                'type': 'VariableDeclaration',
                                'declarations': [
                                    {
                                        'type': 'VariableDeclarator',
                                        'id': {
                                            'type': 'Identifier',
                                            'name': moduleName
                                        },
                                        'init': cb
                                    }
                                ],
                                'kind': 'var'
                            };
                        }
                    }());
                    return updatedNode;
            },
            // convertToFunctionExpression
            // ---------------------------
            //  Returns either an IIFE or variable declaration.
            //  Internally calls either convertToIIFE() or convertToIIFEDeclaration().
            'convertToFunctionExpression': function(obj) {
                var isDefine = obj.isDefine,
                    isRequire = obj.isRequire,
                    isOptimized = false,
                    node = obj.node,
                    moduleName  = obj.moduleName,
                    dependencies = obj.dependencies,
                    depLength = dependencies.length,
                    options = publicAPI.options,
                    dependencyNames = (function() {
                        var deps = [],
                            iterator = -1,
                            currentName;
                        while(++iterator < depLength) {
                            currentName = dependencies[iterator];
                            if(options.globalObject === true && options.globalObjectName && currentName !== '{}') {
                                deps.push({
                                    'type': 'MemberExpression',
                                    'computed': true,
                                    'object': {
                                        'type': 'Identifier',
                                        'name': options.globalObjectName
                                    },
                                    'property': {
                                        'type': 'Literal',
                                        'value': publicAPI.normalizeModuleName(currentName),
                                        'raw': "" + publicAPI.normalizeModuleName(currentName) + ""
                                    },
                                    'name': publicAPI.normalizeModuleName(currentName)
                                });
                            } else {
                                deps.push({
                                    'type': 'Identifier',
                                    'name': publicAPI.normalizeModuleName(currentName)
                                });
                            }
                        }
                        return deps;
                    }()),
                    callbackFunc = (function() {
                        var callbackFunc = obj.moduleReturnValue,
                            body,
                            returnStatements,
                            firstReturnStatement;
                        // If the module has NO dependencies and the callback function is not empty
                        if(!depLength && callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length) {
                            body = callbackFunc.body.body;
                            // Returns an array of all return statements
                            returnStatements = _.where(callbackFunc.body.body, { 'type': 'ReturnStatement' });
                            // If there is only one AST child node in the body of the modula and there is a return statement
                            if(returnStatements.length) {
                                firstReturnStatement = returnStatements[0];
                                if(firstReturnStatement) {
                                    if(!publicAPI.isFunctionExpression(firstReturnStatement) && body.length > 1) {
                                        return callbackFunc;
                                    }
                                    callbackFunc = firstReturnStatement.argument;
                                    isOptimized = true;
                                    if(callbackFunc.params) {
                                        depLength = callbackFunc.params.length
                                    }
                                }
                            }
                        }
                        return callbackFunc;
                    }()),
                    hasReturnStatement = (function() {
                        var returns = [];
                        if(callbackFunc && callbackFunc.body && _.isArray(callbackFunc.body.body)) {
                            returns = _.where(callbackFunc.body.body, { 'type': 'ReturnStatement' });
                            if(returns.length) {
                                return true;
                            }
                        }
                        return false;
                    }()),
                    hasExportsParam = false,
                    callbackFuncParams = (function() {
                        var deps = [],
                            iterator = -1,
                            currentParam,
                            currentName,
                            cbParams = callbackFunc.params || [];
                        while(++iterator < depLength) {
                            currentParam = cbParams[iterator];
                            if(currentParam) {
                                currentName = currentParam.name;
                            } else {
                                currentName = dependencyNames[iterator].name;
                            }
                            if(currentName === 'exports') {
                                hasExportsParam = true;
                            }
                            if(currentName === '{}') {
                                currentName = 'module';
                            }
                            deps.push({
                                'type': 'Identifier',
                                'name': currentName
                            });
                        }
                        return deps;
                    }());

                if(!hasReturnStatement && hasExportsParam) {
                    callbackFunc.body.body.push({
                        'type': 'ReturnStatement',
                        'argument': {
                            'type': 'Identifier',
                            'name': 'exports'
                        }
                    });
                }

                if(isDefine) {
                    return publicAPI.convertToIIFEDeclaration({
                        moduleName: moduleName,
                        dependencyNames: dependencyNames,
                        callbackFuncParams: callbackFuncParams,
                        hasExportsParam: hasExportsParam,
                        callbackFunc: callbackFunc,
                        isOptimized: isOptimized
                    });
                } else if(isRequire) {
                    return publicAPI.convertToIIFE({
                        dependencyNames: dependencyNames,
                        callbackFuncParams: callbackFuncParams,
                        callbackFunc: callbackFunc
                    });
                }
            },
            // convertDefinesAndRequires
            // -------------------------
            //  Replaces define() and require() methods to standard JavaScript
            'convertDefinesAndRequires': function(node, parent) {
                var moduleName,
                    args,
                    dependencies,
                    moduleReturnValue,
                    params,
                    isDefine = publicAPI.isDefine(node),
                    isRequire = publicAPI.isRequire(node),
                    startLineNumber,
                    comments,
                    currentLineNumber,
                    lineNumberObj = {},
                    callbackFuncArg = false,
                    type = '';
                if(node.type === 'Program') {
                    comments = (function() {
                        var arr = [];
                        _.each(node.comments, function(currentComment, iterator) {
                            var currentCommentValue = (currentComment.value).trim();
                            if(currentCommentValue === publicAPI.options.commentCleanName) {
                                arr.push(currentComment);
                            }
                        });
                        return arr;
                    }());
                    _.each(comments, function(currentComment, iterator) {
                        currentLineNumber = currentComment.loc.start.line;
                        lineNumberObj[currentLineNumber] = true;
                    });
                    publicAPI.commentLineNumbers = lineNumberObj;
                }
                if(publicAPI.isAMDConditional(node)) {
                    node.test = {
                        'type': 'Literal',
                        'value': true,
                        'raw': 'true'
                    };
                    return node;
                }
                if(isDefine || isRequire) {
                    startLineNumber = node.expression.loc.start.line;
                    if((publicAPI.commentLineNumbers[startLineNumber] || publicAPI.commentLineNumbers['' + (parseInt(startLineNumber, 10) - 1)])) {
                        return node;
                    }
                    args = Array.prototype.slice.call(node.expression['arguments'], 0);
                    dependencies = (function() {
                        var deps = isRequire ? args[0] : args[args.length - 2],
                            depNames = [];
                        if(_.isPlainObject(deps)) {
                            deps = deps.elements || [];
                        } else {
                            deps = [];
                        }
                        if(Array.isArray(deps) && deps.length) {
                            _.each(deps, function(currentDependency) {
                                if(publicAPI.dependencyBlacklist[currentDependency.value]) {
                                    depNames.push('{}');
                                } else {
                                    depNames.push(currentDependency.value);
                                }
                            });
                        }
                        return depNames;
                    }());
                    moduleReturnValue = isRequire ? args[1] : args[args.length - 1];
                    moduleName = publicAPI.normalizeModuleName(node.expression['arguments'][0].value);
                    params = {
                            node: node,
                            moduleName: moduleName,
                            dependencies: dependencies,
                            moduleReturnValue: moduleReturnValue,
                            isDefine: isDefine,
                            isRequire: isRequire
                    };
                    if(isDefine) {
                        if(_.isObject(publicAPI.options.shimOverrides) && publicAPI.options.shimOverrides[moduleName]) {
                            params.moduleReturnValue = publicAPI.createAst({
                                'code': publicAPI.options.shimOverrides[moduleName]
                            });
                            if(_.isArray(params.moduleReturnValue.body) && _.isObject(params.moduleReturnValue.body[0])) {
                                if(_.isObject(params.moduleReturnValue.body[0].expression)) {
                                    params.moduleReturnValue = params.moduleReturnValue.body[0].expression;
                                    type = 'objectExpression';
                                }
                            } else {
                                params.moduleReturnValue = moduleReturnValue;
                            }
                        }
                        if(params.moduleReturnValue && params.moduleReturnValue.type === 'Identifier') {
                            type = 'functionExpression';
                        }
                        if(_.isArray(publicAPI.options.ignoreModules) && publicAPI.options.ignoreModules.indexOf(moduleName) !== -1) {
                            return node;
                        } else if(publicAPI.isFunctionExpression(moduleReturnValue) || type === 'functionExpression') {
                            return publicAPI.convertToFunctionExpression(params);
                        } else if(publicAPI.isObjectExpression(moduleReturnValue) || type === 'objectExpression') {
                            return publicAPI.convertToObjectDeclaration(params);
                        } else if(publicAPI.isFunctionCallExpression(moduleReturnValue)) {
                            return publicAPI.convertToObjectDeclaration(params, 'functionCallExpression');
                        }
                    } else if(isRequire) {
                        callbackFuncArg = _.isArray(node.expression['arguments']) && node.expression['arguments'].length ? node.expression['arguments'][1] && node.expression['arguments'][1].body && node.expression['arguments'][1].body.body && node.expression['arguments'][1].body.body.length : false;
                        if(publicAPI.options.removeAllRequires !== true && callbackFuncArg) {
                            return publicAPI.convertToFunctionExpression(params);
                        } else {
                            // Remove the require include statement from the source
                            return {
                                type: 'EmptyStatement'
                            };
                        }
                    }
                } else {
                    // If the node is a function expression that has an exports parameter and does not return anything, return exports
                    if(node.type === 'FunctionExpression' &&
                        _.isArray(node.params) &&
                        _.where(node.params, { 'type': 'Identifier', 'name': 'exports' }).length &&
                        _.isObject(node.body) &&
                        _.isArray(node.body.body) &&
                        !_.where(node.body.body, {
                            'type': 'ReturnStatement',
                            'argument': {
                                'type': 'Identifier'
                            }
                        }).length) {
                        // Adds the logical expression, 'exports = exports || {}', to the beginning of the function expression
                        node.body.body.unshift({
                            'type': 'ExpressionStatement',
                            'expression': {
                                'type': 'AssignmentExpression',
                                'operator': '=',
                                'left': {
                                    'type': 'Identifier',
                                    'name': 'exports'
                                },
                                'right': {
                                    'type': 'LogicalExpression',
                                    'operator': '||',
                                    'left': {
                                        'type': 'Identifier',
                                        'name': 'exports'
                                    },
                                    'right': {
                                        'type': 'ObjectExpression',
                                        'properties': []
                                    }
                                }
                            }
                        });
                        // Adds the return statement, 'return exports', to the end of the function expression 
                        node.body.body.push({
                            'type': 'ReturnStatement',
                            'argument': {
                                'type': 'Identifier',
                                'name': 'exports'
                            }
                        });
                    }
                    return node;
                }
            },
            // createAst
            // ---------
            //  Returns an AST (Abstract Syntax Tree) that is generated by Esprima
            'createAst': function(obj) {
                var filePath = obj.filePath,
                    code = obj.code || (filePath && publicAPI.env === 'node' ? publicAPI.readFile(filePath) : ''),
                    esprimaOptions = publicAPI.options.esprima;
                if(!code) {
                    throw new Error(publicAPI.errorMsgs.emptyCode);
                } else {
                    if(!_.isPlainObject(esprima) || !_.isFunction(esprima.parse)) {
                        throw new Error(publicAPI.errorMsgs.esprima);
                    }
                    return esprima.parse(code, esprimaOptions);
                }
            },
           // traverseAndUpdateAst
            // --------------------
            //  Uses Estraverse to traverse the AST and convert all define() and require() methods to standard JavaScript
            'traverseAndUpdateAst': function(obj) {
                if(!_.isPlainObject(obj)) {
                    throw new Error(publicAPI.errorMsgs.invalidObject('traverseAndUpdateAst'));
                }
                var ast = obj.ast,
                    enterDefault = function(node, parent) { return publicAPI.convertDefinesAndRequires(node, parent); },
                    leaveDefault = function(node, parent) { return node; },
                    enterFunc = _.isFunction(obj.enterFunc) ? obj.enterFunc : enterDefault,
                    leaveFunc = _.isFunction(obj.leaveFunc) ? obj.leaveFunc : leaveDefault;
                if(!ast) {
                    throw new Error(publicAPI.errorMsgs.emptyAst('traverseAndUpdateAst'));
                }
                if(!_.isPlainObject(estraverse) || !_.isFunction(estraverse.replace)) {
                    throw new Error(publicAPI.errorMsgs.estraverse);
                }
                estraverse.replace(ast, {
                    'enter': enterFunc,
                    'leave': leaveFunc
                });
                return ast;
            },
            // generateCode
            // ------------
            //  Returns standard JavaScript generated by Escodegen
            'generateCode': function(ast, options) {
                var esprimaOptions = options.esprima || {},
                    escodegenOptions = options.escodegen || {};
                if(!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
                    throw new Error(publicAPI.errorMsgs.escodegen);
                }
                // Check if both the esprima and escodegen comment options are set to true
                if(esprimaOptions.comment === true && escodegenOptions.comment === true) {
                    // Needed to keep source code comments when generating the code with escodegen
                    ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
                }
                return escodegen.generate(ast, escodegenOptions);
            },
            // clean
            // -----
            //  Creates an AST using Esprima, traverse and updates the AST using Estraverse, and generates standard JavaScript using Escodegen.
            'clean': function(obj) {
                var code = {},
                    ast = {},
                    options = {},
                    defaultOptions = _.cloneDeep(publicAPI.defaultOptions) || {},
                    userOptions = _.cloneDeep(obj) || {};
                publicAPI.options = options = _.merge(defaultOptions, userOptions);
                if(!_ || !_.isPlainObject) {
                    throw new Error(publicAPI.errorMsgs.lodash);
                }
                if(!_.isPlainObject(obj) && _.isString(obj)) {
                    code.code = obj;
                } else if(_.isPlainObject(obj)) {
                    code = obj;
                } else {
                    throw new Error(publicAPI.errorMsgs.invalidObject('clean'));
                }
                ast = publicAPI.traverseAndUpdateAst({
                    ast: publicAPI.createAst(code)
                });
                // Removes all empty statements from the source so that there are no single semicolons and
                // Make sure that all require() CommonJS calls are converted
                if(ast && _.isArray(ast.body)) {
                    estraverse.replace(ast, {
                        enter: function(node, parent) {
                            if(node === undefined || node.type === 'EmptyStatement') {
                                _.each(parent.body, function(currentNode, iterator) {
                                    if(currentNode === undefined || currentNode.type === 'EmptyStatement') {
                                        parent.body.splice(iterator, 1);
                                    }
                                });
                            } else if(publicAPI.isRequireExpression(node)) {
                                if(node.arguments && node.arguments[0] && node.arguments[0].value) {
                                    return {
                                        'type': 'Identifier',
                                        'name': publicAPI.normalizeModuleName(node.arguments[0].value)
                                    };
                                } else {
                                    return node;
                                }
                            }

                        }
                    });
                }
                if(_.isArray(options.globalModules)) {
                    _.each(options.globalModules, function(currentModule) {
                        if(_.isString(currentModule) && currentModule.length) {
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
                                            'name': 'window'
                                        },
                                        'property': {
                                            'type': 'Identifier',
                                            'name': currentModule
                                        }
                                    },
                                    'right': {
                                        'type': 'Identifier',
                                        'name': currentModule
                                    }
                                }
                            });
                        }
                    });
                }

                if(options.globalObject === true && options.globalObjectName && !publicAPI.createdGlobalObject) {
                    if(options.rememberGlobalObject === true) {
                        publicAPI.createdGlobalObject = true;
                    }
                    ast.body.unshift({
                        'type': 'VariableDeclaration',
                        'declarations': [
                            {
                                'type': 'VariableDeclarator',
                                'id': {
                                    'type': 'Identifier',
                                    'name': options.globalObjectName
                                },
                                'init': {
                                    'type': 'ObjectExpression',
                                    'properties': []
                                }
                            }
                        ],
                        'kind': 'var'
                    });
                }
                return publicAPI.generateCode(ast, options);
            }
        };
        // Returns the public API for node and web environments
        if(codeEnv === 'node') {
            module.exports = publicAPI;
        } else {
            return publicAPI;
        }
})); // End of amdclean module