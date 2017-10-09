// getNormalizedModuleName.js
// ==========================
// Retrieves the module id if the current node is a define() method

define([
  'utils',
  'normalizeModuleName'
], function(
  utils,
  normalizeModuleName
) {
  return function getNormalizedModuleName(node, parent) {
    var isDefine = utils.isDefine(node, parent);
    if (!isDefine) {
      return;
    }

    var amdclean = this,
      expression = isDefine.expression,
      moduleId = expression['arguments'][0].value,
      moduleName = normalizeModuleName.call(amdclean, moduleId);

    return moduleName;
  };
});