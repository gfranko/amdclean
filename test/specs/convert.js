describe('amdclean specs', function() {
	var amdclean = require('../../src/amdclean');

	describe('define() method conversions', function() {

		describe('functions', function() {

			it('should convert function return values to immediately invoked function declarations', function() {
				var AMDcode = "define('example', [], function() {});",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=function (){}();";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should correctly set callback parameters to the callback function', function() {
				var AMDcode = "define('example', ['example1', 'example2'], function(one, two) {});",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=function (one,two){two=example2;one=example1;}();";
				expect(cleanedCode).toBe(standardJavaScript);
			});

		});

		describe('objects', function() {

			it('should convert object return values to variable declarations', function() {
				var AMDcode = "define('third', { exampleProp: 'This is an example' });",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var third={exampleProp:'This is an example'};";
				expect(cleanedCode).toBe(standardJavaScript);
			});

		});

	});

	describe('require() method conversions', function() {

		describe('functions', function() {

			it('should convert function return values to locally scoped IIFEs', function() {
				var AMDcode = "require([], function() { var example = true; });",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "(function(){var example=true;}());";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should pass the correct parameters to the locally scoped IIFEs', function() {
				var AMDcode = "require(['anotherModule'], function(anotherModule) { var example = true; });",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "(function(anotherModule){var example=true;}(anotherModule));";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('remove require() calls with no callback functions', function() {
				var AMDcode = "require(['anotherModule']);",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "";
				expect(cleanedCode).toBe(standardJavaScript);
			});

		});

	});

});