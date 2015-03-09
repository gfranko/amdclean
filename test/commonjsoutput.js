define('commonjs3',['require','exports','module'],function (require, exports, module) {exports.exampleFunc = function() {
  var test = true;
  return test;
}
});

define('commonjs2',['require','exports','module','commonjs3'],function (require, exports, module) {module.exports = {
	'exampleBool': true,
	'exampleFunc': require('commonjs3').exampleFunc
}
});

define('commonjs4',['require','exports','module'],function (require, exports, module) {exports.test = 'this is a test';
});

define('commonjs1',['require','exports','module','./commonjs2','./commonjs4'],function (require, exports, module) {var commonjs2 = require('./commonjs2');

var _commonjs2_ = 'blah';

var commonjs4 = require('./commonjs4');

commonjs2.exampleFunc();
});

