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
					standardJavaScript = "var example=function (one,two){}(example1,example2);";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should correctly normalize relative file paths', function() {
				var AMDcode = "define('./modules/example', ['example1', 'example2'], function(one, two) {});",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var modules_example=function (one,two){}(example1,example2);";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should not convert defines with an /*amdclean*/ comment before it', function() {
				var AMDcode = "/*amdclean*/define('./modules/example', ['example1', 'example2'], function(one, two) {});",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "define('./modules/example',['example1','example2'],function(one,two){});";
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

		describe('CommonJS Variable Declarations', function() {

			it('should convert CommonJS require() calls', function() {
				var AMDcode = "var example = require('anotherModule');",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=anotherModule;";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should convert CommonJS require() calls with file paths', function() {
				var AMDcode = "var example = require('./anotherModule');",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=anotherModule;";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should convert CommonJS require() calls with advanced file paths', function() {
				var AMDcode = "var example = require('./../anotherModule');",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=anotherModule;";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should convert CommonJS require() calls with single properties', function() {
				var AMDcode = "var example = require('./anotherModule').prop;",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=anotherModule.prop;";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should convert CommonJS require() calls with method calls', function() {
				var AMDcode = "var example = require('./anotherModule').prop();",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "var example=anotherModule.prop();";
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

			it('should correctly normalize relative file paths', function() {
				var AMDcode = "require(['./modules/anotherModule'], function(anotherModule) { var example = true; });",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "(function(anotherModule){var example=true;}(modules_anotherModule));";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should not convert requires with an /*amdclean*/ comment before it', function() {
				var AMDcode = "/*amdclean*/require(['./modules/anotherModule'], function(anotherModule) { var example = true; });",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "require(['./modules/anotherModule'],function(anotherModule){var example=true;});";
				expect(cleanedCode).toBe(standardJavaScript);
			});

			it('should remove require() calls with no callback functions', function() {
				var AMDcode = "require(['anotherModule']);",
					cleanedCode = amdclean.clean({ code: AMDcode, escodegen: { format: { compact: true } } }),
					standardJavaScript = "";
				expect(cleanedCode).toBe(standardJavaScript);
			});

		});

	});

});