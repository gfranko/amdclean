// findAndStoreAllModuleIds.js
// ===========================
// Uses Estraverse to traverse the AST so that all of the module ids can be found and stored in an object

define([
	'errorMsgs',
	'getNormalizedModuleName'
], function(
	errorMsgs,
	getNormalizedModuleName
) {
	return function findAndStoreAllModuleIds(ast) {
		var amdclean = this;

		if(!ast) {
		    throw new Error(errorMsgs.emptyAst('findAndStoreAllModuleIds'));
		}

		if(!_.isPlainObject(estraverse) || !_.isFunction(estraverse.traverse)) {
		    throw new Error(errorMsgs.estraverse);
		}

		estraverse.traverse(ast, {
		    'enter': function(node, parent) {
		        var moduleName = getNormalizedModuleName.call(amdclean, node, parent);

		        // If the current module has not been stored, store it
		        if(moduleName && !amdclean.storedModules[moduleName]) {
		            amdclean.storedModules[moduleName] = true;
		        }
		    }
		});
	};
});