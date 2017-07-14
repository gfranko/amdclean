// normalizeModuleName.js
// ======================
// Returns a normalized module name (removes relative file path urls)

define([
  'utils',
  'defaultValues'
], function(
  utils,
  defaultValues
) {
  return function normalizeModuleName(name, moduleId) {
    var amdclean = this,
      options = amdclean.options,
      prefixMode = options.prefixMode,
      prefixTransform = options.prefixTransform,
      dependencyBlacklist = defaultValues.dependencyBlacklist,
      prefixTransformValue,
      preNormalized,
      postNormalized;

    name = name || '';

    if (name === '{}') {
      if (dependencyBlacklist[name] === 'remove') {
        return '';
      } else {
        return name;
      }
    }

    preNormalized = utils.prefixReservedWords(
      name.replace(/\./g, '')
        .replace(utils.invalidIdentifierStartSymbol, '')
        .replace(utils.invalidIdentifierTrailingSymbol, '_')
        .replace(/^_+/, '')
    );

    postNormalized = prefixMode === 'camelCase' ? utils.convertToCamelCase(preNormalized) : preNormalized;

    if (_.isFunction(prefixTransform)) {
      prefixTransformValue = prefixTransform(postNormalized, name);
      if (_.isString(prefixTransformValue) && prefixTransformValue.length) {
        return prefixTransformValue;
      }
    }

    return postNormalized;
  };
});