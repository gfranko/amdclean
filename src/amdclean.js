/*! amdclean - v0.2.2 - 2013-10-13 
* http://gregfranko.com/amdclean
* Copyright (c) 2013 Greg Franko; Licensed MIT*/

(function (root, factory, undefined) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        if(typeof exports !== 'undefined') {
            factory.env = 'node';
        } else {
            factory.env = 'web';
        }
        define([], function() {
            return factory();
        });
    } else if (typeof exports !== 'undefined') {
        factory.env = 'node';
        factory();
    } else {
        factory.env = 'web';
        root.amdclean = factory();
    }
}(this, function cleanamd() {
    // Environment - either node or web
    var codeEnv = cleanamd.env,
        // Third-Party Dependencies
        esprima = codeEnv === 'node' ? require('esprima'): window.esprima,
        estraverse = codeEnv === 'node' ? require('estraverse'): window.estraverse,
        escodegen = codeEnv === 'node' ? require('escodegen'): window.escodegen,
        _ = codeEnv === 'node' ? require('lodash'): window._,
        fs = codeEnv === 'node' ? require('fs'): {}, // End Third-Party Dependencies
        // The Public API object
        publicAPI = {
            // Current project version number
            VERSION: '0.2.2',
            // Environment - either node or web
            env: codeEnv,
            // Object that keeps track of module ids/names that are used
            moduleNamesStore: {},
            // All of the error messages presented to users
            errorMsgs: {
                // A module is defined more than one time
                'uniqueModuleName': {
                    'error': function(moduleName) {
                        return 'Error: ' + 'Not a unique module name: ' + moduleName + '\n';
                    },
                    'fix': 'Fix: ' + 'Make sure that you assign unique module paths using the require.config() method.  Take a look at http://requirejs.org/docs/api.html#config for more details\n',
                    'exiting': 'Result: Did not complete and exiting...'
                },
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
            // readFile
            // --------
            //  Synchronous file reading for node
            readFile: function(path) {
                if(publicAPI.env !== 'node') {
                    return '';
                }
                return fs.readFileSync(path, 'utf8');
            },
            // isDefine
            // --------
            //  Returns if the current AST node is a define() method call
            isDefine: function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return node.type === 'ExpressionStatement' &&
                    !_.isUndefined(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'define';
            },
            // isRequire
            // ---------
            //  Returns if the current AST node is a require() method call
            isRequire: function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return node.type === 'ExpressionStatement' &&
                    !_.isUndefined(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'require';
            },
            // isObjectExpression
            // ------------------
            //  Returns if the current AST node is an object literal
            isObjectExpression: function(expression) {
                return expression && _.isPlainObject(expression) && expression.type === 'ObjectExpression';
            },
            // isFunctionExpression
            // --------------------
            //  Returns if the current AST node is a function
            isFunctionExpression: function(expression) {
                return expression && _.isPlainObject(expression) && expression.type === 'FunctionExpression';
            },
            // normalizeModuleName
            // -------------------
            //  Returns a normalized module name (removes relative file path urls)
            normalizeModuleName: function(name) {
                name = name || '';
                var moduleName = name,
                    folderName,
                    fileName,
                    lastIndex = name.lastIndexOf('/'),
                    containsRelativePath = name.lastIndexOf('/') !== -1;
                if(containsRelativePath) {
                    moduleName = moduleName.substring(0, lastIndex);
                    folderName = moduleName.substring((moduleName.lastIndexOf('/') + 1), moduleName.length);
                    fileName = name.substring((lastIndex + 1), name.length);
                    return folderName + '_' + fileName;
                } else {
                    return name;
                }
            },
            // hasUniqueModelName
            // ------------------
            //  Returns if the current module id/name has already been used
            hasUniqueModuleName: function(node) {
                var moduleName;
                if( node.expression['arguments'] &&
                    Array.isArray(node.expression['arguments']) &&
                    _.isPlainObject(node.expression['arguments'][0]) &&
                    node.expression['arguments'][0].value ) {
                        moduleName = node.expression['arguments'][0].value;
                        if(_.isString(moduleName) && moduleName.length > 0 && !publicAPI.moduleNamesStore[moduleName]) {
                            publicAPI.moduleNamesStore[moduleName] = true;
                            return true;
                        }
                        else {
                            throw new Error(publicAPI.errorMsgs.uniqueModuleName.error(moduleName) + publicAPI.errorMsgs.uniqueModuleName.fix + publicAPI.errorMsgs.uniqueModuleName.exiting);
                        }
                } else {
                    return true;
                }
            },
            // convertToObjectDeclaration
            // --------------------------
            //  Returns an object variable declaration
            //  ( e.g. var example = { exampleProp: true } )
            convertToObjectDeclaration: function(obj) {
                var node = obj.node,
                    moduleName  = obj.moduleName,
                    moduleReturnValue = obj.moduleReturnValue;
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
            },
            // convertToIIFE
            // -------------
            //  Returns an IIFE
            //  ( e.g. (function() { }()) )
            convertToIIFE: function(obj) {
                var callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc,
                    dependencyNames = obj.dependencyNames;
                // console.log('dependencyNames', dependencyNames);
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
            //  ( e.g. var example = function(){}() )
            convertToIIFEDeclaration: function(obj) {
                var moduleName = obj.moduleName,
                    callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc,
                    dependencyNames = obj.dependencyNames;
                return {
                    'type': 'VariableDeclaration',
                    'declarations': [
                        {
                            'type': 'VariableDeclarator',
                            'id': {
                                'type': 'Identifier',
                                'name': moduleName
                            },
                            'init': {
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
                    ],
                    'kind': 'var'
                };
            },
            // convertToFunctionExpression
            // ---------------------------
            //  Returns either an IIFE or variable declaration.
            //  Internally calls either convertToIIFE() or convertToIIFEDeclaration().
            convertToFunctionExpression: function(obj) {
                var isDefine = obj.isDefine,
                    isRequire = obj.isRequire,
                    node = obj.node,
                    moduleName  = obj.moduleName,
                    callbackFunc = obj.moduleReturnValue,
                    callbackFuncParams = (function() {
                        var deps = [],
                            cbParams = callbackFunc.params || [];
                        _.each(cbParams, function(currentParam) {
                            deps.push({ 'type': 'Identifier', 'name': currentParam.name });
                        });
                        return deps;
                    }()),
                    dependencies = obj.dependencies,
                    dependencyNames = (function() {
                        var arr = [], names = dependencies;
                        _.each(callbackFuncParams, function(currentCallbackFuncParam, iterator) {
                            arr.push({ type: 'Identifier', name: publicAPI.normalizeModuleName(names[iterator]) });
                        });
                        return arr;
                    }());
                if(isDefine) {
                    return publicAPI.convertToIIFEDeclaration({
                        moduleName: moduleName,
                        dependencyNames: dependencyNames,
                        callbackFuncParams: callbackFuncParams,
                        callbackFunc: callbackFunc
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
            convertDefinesAndRequires: function(node, parent) {
                var moduleName,
                    args,
                    dependencies,
                    moduleReturnValue,
                    params,
                    isDefine = publicAPI.isDefine(node),
                    isRequire = publicAPI.isRequire(node);
                if((isDefine && publicAPI.hasUniqueModuleName(node)) || isRequire) {
                    args = node.expression['arguments'];
                    dependencies = (function() {
                        var deps = _.isPlainObject(args[args.length - 2]) ? args[args.length - 2].elements : [],
                        depNames = [];
                        if(Array.isArray(deps) && deps.length) {
                            _.each(deps, function(currentDependency) {
                                depNames.push(currentDependency.value);
                            });
                        }
                        return depNames;
                    }()),
                    moduleReturnValue = args[args.length - 1];
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
                        if(publicAPI.isFunctionExpression(moduleReturnValue)) {
                            return publicAPI.convertToFunctionExpression(params);
                        } else if(publicAPI.isObjectExpression(moduleReturnValue)) {
                            return publicAPI.convertToObjectDeclaration(params);
                        }
                    } else if(isRequire) {
                        if(node.expression['arguments'].length > 1) {
                            return publicAPI.convertToFunctionExpression(params);
                        } else {
                            // Remove the require include statement from the source
                            return { type: 'EmptyStatement', expression: {} };
                        }
                    }
                } else {
                    return node;
                }
            },
            // createAst
            // ---------
            //  Returns an AST (Abstract Syntax Tree) that is generated by Esprima
            createAst: function(obj) {
                var filePath = obj.filePath,
                    code = obj.code || (filePath && publicAPI.env === 'node' ? publicAPI.readFile(filePath) : ''),
                    esprimaDefaultOptions = {},
                    esprimaOptions = _.extend(esprimaDefaultOptions, (_.isPlainObject(obj.esprima) ? obj.esprima : {}));
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
            traverseAndUpdateAst: function(obj) {
                if(!_.isPlainObject(obj)) {
                    throw new Error(publicAPI.errorMsgs.invalidObject('traverseAndUpdateAst'));
                }
                var ast = obj.ast,
                    enterDefault = function(node, parent) { return publicAPI.convertDefinesAndRequires(node, parent); };
                    leaveDefault = function(node, parent) { return node; };
                    enterFunc = _.isFunction(obj.enterFunc) ? obj.enterFunc : enterDefault,
                    leaveFunc = _.isFunction(obj.leaveFunc) ? obj.leaveFunc : leaveDefault;
                if(!ast) {
                    throw new Error(publicAPI.errorMsgs.emptyAst('traverseAndUpdateAst'));
                }
                if(!_.isPlainObject(estraverse) || !_.isFunction(estraverse.replace)) {
                    throw new Error(exportedProps.errorMsgs.estraverse);
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
            generateCode: function(ast, options) {
                if(!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
                    throw new Error(exportedProps.errorMsgs.escodegen);
                }
                return escodegen.generate(ast, options);
            },
            // clean
            // -----
            //  Creates an AST using Esprima, traverse and updates the AST using Estraverse, and generates standard JavaScript using Escodegen.
            clean: function(obj) {
                var code = {},
                    ast = {},
                    escodegenOptions = {};
                if(!_ || !_.isPlainObject) {
                    throw new Error(publicAPI.errorMsgs.lodash);
                }
                if(!_.isPlainObject(obj) && _.isString(obj)) {
                    code['code'] = obj;
                } else if(_.isPlainObject(obj)) {
                    code = obj;
                } else {
                    throw new Error(publicAPI.errorMsgs.invalidObject('clean'));
                }
                ast = publicAPI.traverseAndUpdateAst({
                    ast: publicAPI.createAst(code)
                });
                // Removes all empty statements from the source so that there are no single semicolons
                if(ast && _.isArray(ast.body)) {
                    _.each(ast.body, function(currentNode, iterator) {
                        if(currentNode === undefined || currentNode.type === 'EmptyStatement') {
                            ast.body.splice(iterator, 1);
                        }
                    });
                }
                escodegenOptions = _.isPlainObject(obj.escodegen) ? obj.escodegen : {};
                publicAPI.moduleNamesStore = {};
                return publicAPI.generateCode(ast, escodegenOptions);
            }
        };
        // Returns the public API for node and web environments
        if(codeEnv === 'node') {
            module.exports = publicAPI;
        } else {
            return publicAPI;
        }
})); // End of amdclean module