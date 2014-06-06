// convertDefinesAndRequires.js
// ============================
//  Replaces define() and require() methods to standard JavaScript

define([
	'utils',
	'convertToFunctionExpression',
	'convertToObjectDeclaration',
    'defaultValues',
    'normalizeModuleName',
    'createAst'
], function(
	utils,
	convertToFunctionExpression,
	convertToObjectDeclaration,
    defaultValues,
    normalizeModuleName,
    createAst
) {
    return function convertDefinesAndRequires(node, parent) {
        var amdclean = this,
            options = amdclean.options,
            moduleName,
            args,
            dependencies,
            moduleReturnValue,
            moduleId,
            params,
            isDefine = utils.isDefine(node),
            isRequire = utils.isRequire(node),
            startLineNumber,
            callbackFuncArg = false,
            type = '',
            shouldBeIgnored,
            moduleToBeIgnored,
            parentHasFunctionExpressionArgument,
            defaultRange = defaultValues.defaultRange,
            defaultLOC = defaultValues.defaultLOC,
            range = node.range || defaultRange,
            loc = node.loc || defaultLOC,
            dependencyBlacklist = defaultValues.dependencyBlacklist;

        startLineNumber = isDefine || isRequire ? node.expression.loc.start.line : node && node.loc && node.loc.start ? node.loc.start.line : null;

        shouldBeIgnored = (amdclean.matchingCommentLineNumbers[startLineNumber] || amdclean.matchingCommentLineNumbers[startLineNumber - 1]);
        
        // If it is an AMD conditional statement
        // e.g. if(typeof define === 'function') {}
        if(utils.isAMDConditional(node)) {

            // If the AMD conditional statement should be transformed and not ignored
            if(!shouldBeIgnored && options.transformAMDChecks === true) {

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

            // If the AMD conditional statement should not be transformed
            if(options.transformAMDChecks === false) {
                estraverse.traverse(node, {
                    'enter': function(node) {
                        if(utils.isDefine(node)) {
                            if(node.expression && node.expression.arguments && node.expression.arguments.length) {
                                // Add the module name to the ignore list
                                if(node.expression.arguments[0].type === 'Literal' && node.expression.arguments[0].value) {
                                    amdclean.conditionalModulesToIgnore[node.expression.arguments[0].value] = true;
                                    if(options.createAnonymousAMDModule === true) {
                                        amdclean.storedModules[node.expression.arguments[0].value] = false;
                                        node.expression.arguments.shift();
                                    }
                                }   
                            }
                        }
                    }
                });
            }
        }

        if(isDefine || isRequire) {
            args = Array.prototype.slice.call(node.expression['arguments'], 0);

            dependencies = (function() {
                var deps = isRequire ? args[0] : args[args.length - 2],
                    depNames = [],
                    hasExportsParam;

                if(_.isPlainObject(deps)) {
                    deps = deps.elements || [];
                } else {
                    deps = [];
                }

                hasExportsParam = _.where(deps, {
                    'value': 'exports'
                }).length;

                if(_.isArray(deps) && deps.length) {

                    _.each(deps, function(currentDependency) {

                        if(dependencyBlacklist[currentDependency.value] !== 'remove') {

                            if(dependencyBlacklist[currentDependency.value]) {
                                depNames.push('{}');
                            } else {
                                depNames.push(currentDependency.value);
                            }
                        } else {
                            if(!hasExportsParam) {
                                depNames.push('{}');
                            }
                        }
                    });
                }
                return depNames;
            }());

            moduleReturnValue = isRequire ? args[1] : args[args.length - 1];

            moduleId = node.expression['arguments'][0].value;

            moduleName = normalizeModuleName.call(amdclean, moduleId);

            params = {
                    'node': node,
                    'moduleName': moduleName,
                    'moduleId': moduleId,
                    'dependencies': dependencies,
                    'moduleReturnValue': moduleReturnValue,
                    'isDefine': isDefine,
                    'isRequire': isRequire,
                    'range': range,
                    'loc': loc
            };

            if(isDefine) {

                if(shouldBeIgnored || !moduleName || amdclean.conditionalModulesToIgnore[moduleName] === true) {
                    amdclean.options.ignoreModules.push(moduleName);
                    return node;
                }

                if(_.contains(options.removeModules, moduleName)) {

                    amdclean.storedModules[moduleName] = false;

                    // Remove the current module from the source
                    return {
                        'type': 'EmptyStatement'
                    };
                }

                if(_.isObject(options.shimOverrides) && options.shimOverrides[moduleName]) {
                    params.moduleReturnValue = createAst.call(amdclean, options.shimOverrides[moduleName]);

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

                if(_.contains(options.ignoreModules, moduleName)) {
                    return node;
                } else if(utils.isFunctionExpression(moduleReturnValue) || type === 'functionExpression') {
                    return convertToFunctionExpression.call(amdclean, params);
                } else if(utils.isObjectExpression(moduleReturnValue) || type === 'objectExpression') {
                    return convertToObjectDeclaration.call(amdclean, params);
                } else if(utils.isFunctionCallExpression(moduleReturnValue)) {
                    return convertToObjectDeclaration.call(amdclean, params, 'functionCallExpression');
                }

            } else if(isRequire) {

                if(shouldBeIgnored) {
                    return node;
                }

                callbackFuncArg = _.isArray(node.expression['arguments']) && node.expression['arguments'].length ? node.expression['arguments'][1] && node.expression['arguments'][1].body && node.expression['arguments'][1].body.body && node.expression['arguments'][1].body.body.length : false;

                if(options.removeAllRequires !== true && callbackFuncArg) {
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

                parentHasFunctionExpressionArgument = (function () {

                    if (!parent || !parent.arguments) {
                        return false;
                    }

                    if (parent && parent.arguments && parent.arguments.length) {
                        return _.where(parent.arguments, { 'type': 'FunctionExpression' }).length;
                    }

                    return false;
                }());

                if(parentHasFunctionExpressionArgument) {

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
});