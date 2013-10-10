(function (root, factory, undefined) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        factory.env = 'amd';
        define([], function() {
            return factory();
        });
    } else if (typeof exports !== 'undefined') {
        factory.env = 'node';
        factory();
    } else {
        factory.env = 'web';
        root.cleanamd = factory();
    }
}(this, function cleanamd() {
    var codeEnv = cleanamd.env,
        esprima = codeEnv === 'node' ? require('esprima'): window.esprima,
        estraverse = codeEnv === 'node' ? require('estraverse'): window.estraverse,
        escodegen = codeEnv === 'node' ? require('escodegen'): window.escodegen,
        _ = codeEnv === 'node' ? require('lodash'): window._,
        fs = codeEnv === 'node' ? require('fs'): {},
        utils = {
            VERSION: '0.1.0',
            env: codeEnv,
            moduleNamesStore: {},
            errorMsgs: {
                'uniqueModuleName': {
                    'error': function(moduleName) {
                        return 'Error: ' + 'Not a unique module name: ' + moduleName + '\n';
                    },
                    'fix': 'Fix: ' + 'Make sure that you assign unique module paths using the require.config() method.  Take a look at http://requirejs.org/docs/api.html#config for more details\n',
                    'exiting': 'Result: Did not complete and exiting...'
                },
                'emptyCode': 'There is no code to generate the AST with',
                'emptyAst': function(methodName) {
                    return 'An AST is not being passed to the ' + methodName + '() method';
                },
                'invalidObject': function(methodName) {
                    return 'An object is not being passed as the first parameter to the ' + methodName + '() method';
                },
                'lodash': 'There is not an _.isPlainObject() method.  Make sure you have included lodash (https://github.com/lodash/lodash).',
                'esprima': 'There is not an esprima.parse() method.  Make sure you have included esprima (https://github.com/ariya/esprima).',
                'estraverse': 'There is not an estraverse.replace() method.  Make sure you have included estraverse (https://github.com/Constellation/estraverse).',
                'escodegen': 'There is not an escodegen.generate() method.  Make sure you have included escodegen (https://github.com/Constellation/escodegen).'
            },
            readFile: function(path) {
                if(utils.env !== 'node') {
                    return '';
                }
                return fs.readFileSync(path, 'utf8');
            },
            isDefine: function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return node.type === 'ExpressionStatement' &&
                    !_.isUndefined(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'define';
            },
            isRequire: function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return node.type === 'ExpressionStatement' &&
                    !_.isUndefined(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'require';
            },
            isObjectExpression: function(expression) {
                return expression && _.isPlainObject(expression) && expression.type === 'ObjectExpression';
            },
            isFunctionExpression: function(expression) {
                return expression && _.isPlainObject(expression) && expression.type === 'FunctionExpression';
            },
            hasUniqueModuleName: function(node) {
                var moduleName;
                if( node.expression['arguments'] &&
                    Array.isArray(node.expression['arguments']) &&
                    _.isPlainObject(node.expression['arguments'][0]) &&
                    node.expression['arguments'][0].value ) {
                        moduleName = node.expression['arguments'][0].value;
                        if(_.isString(moduleName) && moduleName.length > 0 && !utils.moduleNamesStore[moduleName]) {
                            utils.moduleNamesStore[moduleName] = true;
                            return true;
                        }
                        else {
                            throw new Error(utils.errorMsgs.uniqueModuleName.error(moduleName) + utils.errorMsgs.uniqueModuleName.fix + utils.errorMsgs.uniqueModuleName.exiting);
                        }
                } else {
                    return true;
                }
            },
            convertToObjectExpression: function(obj) {
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
            convertToAnonymousFunction: function(obj) {
                var callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc,
                    dependencyNames = (function() {
                        var arr = [], names = obj.dependencyNames;
                        _.each(callbackFuncParams, function(currentCallbackFuncParam, iterator) {
                            arr.push({ type: 'Identifier', name: names[iterator] });
                        });
                        return arr;
                    }());
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
            convertToVariableDeclaration: function(obj) {
                var moduleName = obj.moduleName,
                    callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc;
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
                                'arguments': []
                            }
                        }
                    ],
                    'kind': 'var'
                };
            },
            convertToFunctionExpression: function(obj) {
                var isDefine = obj.isDefine,
                    isRequire = obj.isRequire,
                    node = obj.node,
                    moduleName  = obj.moduleName,
                    callbackFunc = obj.moduleReturnValue,
                    dependencies = obj.dependencies,
                    callbackFuncParams = (function() {
                        var deps = [],
                            cbParams = callbackFunc.params || [];
                        _.each(cbParams, function(currentParam) {
                            deps.push({ 'type': 'Identifier', 'name': currentParam.name });
                        });
                        return deps;
                    }()),
                    currentCallbackAssignment = {};
                if(isDefine) {
                    _.each(callbackFuncParams, function(currentCallbackFuncParam, iterator) {
                        currentCallbackAssignment = {
                            'type': 'ExpressionStatement',
                            'expression': {
                                'type': 'AssignmentExpression',
                                'operator': '=',
                                'left': {
                                    'type': 'Identifier',
                                    'name': currentCallbackFuncParam.name
                                },
                                'right': {
                                    'type': 'Identifier',
                                    'name': dependencies[iterator]
                                }
                            }
                        };
                        if(callbackFunc.body && callbackFunc.body.body && Array.isArray(callbackFunc.body.body)) {
                            callbackFunc.body.body.unshift(currentCallbackAssignment);
                        }
                    });
                    return utils.convertToVariableDeclaration({
                        moduleName: moduleName,
                        callbackFuncParams: callbackFuncParams,
                        callbackFunc: callbackFunc
                    });
                } else if(isRequire) {
                    return utils.convertToAnonymousFunction({
                        dependencyNames: dependencies,
                        callbackFuncParams: callbackFuncParams,
                        callbackFunc: callbackFunc
                    });
                }
            },
            convertDefinesAndRequires: function(node, parent) {
                var moduleName,
                    args,
                    dependencies,
                    moduleReturnValue,
                    params,
                    isDefine = utils.isDefine(node),
                    isRequire = utils.isRequire(node);
                if((isDefine && utils.hasUniqueModuleName(node)) || isRequire) {
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
                    moduleName = node.expression['arguments'][0].value;
                    params = {
                            node: node,
                            moduleName: moduleName,
                            dependencies: dependencies,
                            moduleReturnValue: moduleReturnValue,
                            isDefine: isDefine,
                            isRequire: isRequire
                    };
                    if(isDefine) {
                        if(utils.isFunctionExpression(moduleReturnValue)) {
                            return utils.convertToFunctionExpression(params);
                        } else if(utils.isObjectExpression(moduleReturnValue)) {
                            return utils.convertToObjectExpression(params);
                        }
                    } else if(isRequire) {
                        if(node.expression['arguments'].length > 1) {
                            return utils.convertToFunctionExpression(params);
                        } else {
                            // Remove the require include statement from the source
                            return { type: 'EmptyStatement', expression: {} };
                        }
                    }
                } else {
                    return node;
                }
            },
            createAst: function(obj) {
                var filePath = obj.filePath,
                    code = obj.code || (filePath && utils.env === 'node' ? utils.readFile(filePath) : ''),
                    esprimaDefaultOptions = {},
                    esprimaOptions = _.extend(esprimaDefaultOptions, (_.isPlainObject(obj.esprimaOptions) ? obj.esprimaOptions : {}));
                if(!code) {
                    throw new Error(utils.errorMsgs.emptyCode);
                } else {
                    if(!_.isPlainObject(esprima) || !_.isFunction(esprima.parse)) {
                        throw new Error(utils.errorMsgs.esprima);
                    }
                    return esprima.parse(code, esprimaOptions);
                }
            },
            traverseAndUpdateAst: function(obj) {
                if(!_.isPlainObject(obj)) {
                    throw new Error(utils.errorMsgs.invalidObject('traverseAndUpdateAst'));
                }
                var ast = obj.ast,
                    enterDefault = function(node, parent) { return utils.convertDefinesAndRequires(node, parent); };
                    leaveDefault = function(node, parent) { return node; };
                    enterFunc = _.isFunction(obj.enterFunc) ? obj.enterFunc : enterDefault,
                    leaveFunc = _.isFunction(obj.leaveFunc) ? obj.leaveFunc : leaveDefault;
                if(!ast) {
                    throw new Error(utils.errorMsgs.emptyAst('traverseAndUpdateAst'));
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
            generateCode: function(ast, options) {
                if(!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
                    throw new Error(exportedProps.errorMsgs.escodegen);
                }
                return escodegen.generate(ast, options);
            },
            clean: function(obj) {
                var code = {},
                    ast = {},
                    generateOptions = {};
                if(!_ || !_.isPlainObject) {
                    throw new Error(utils.errorMsgs.lodash);
                }
                if(!_.isPlainObject(obj) && _.isString(obj)) {
                    code['code'] = obj;
                } else if(_.isPlainObject(obj)) {
                    code = obj;
                } else {
                    throw new Error(utils.errorMsgs.invalidObject('clean'));
                }
                ast = utils.traverseAndUpdateAst({
                    ast: utils.createAst(code)
                });
                // Removes all empty statements from the source so that there are no single semicolons
                if(ast && _.isArray(ast.body)) {
                    _.each(ast.body, function(currentNode, iterator) {
                        if(currentNode.type === 'EmptyStatement') {
                            ast.body.splice(iterator, 1);
                        }
                    });
                }
                // console.log('all empty statements');
                generateOptions = _.isPlainObject(obj.escodegenOptions) ? obj.escodegenOptions : {};
                return utils.generateCode(ast, generateOptions);
            }
        };
        if(codeEnv === 'node') {
            module.exports = utils;
        } else {
            return utils;
        }
}));