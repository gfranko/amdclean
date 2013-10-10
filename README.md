#amdclean
=========

A build tool that converts AMD code to standard JavaScript.

## Use Case

**Single file** JavaScript libraries or applications that use AMD, but do not use AMD plugins (e.g. text! plugin).

## Why

Many developers like to use the AMD API to write modular JavaScript, but do not want to include a full AMD loader (e.g. RequireJS), or AMD shim (e.g. Almond.js) because of file size.

By incorporating amdclean into the build process, there is no need for RequireJS or Almond.

Since amdclean rewrites your source file into standard JavaScript, it is a great
fit for JavaScript library authors who want a tiny download in one file after using the
[RequireJS Optimizer](http://requirejs.org/docs/optimization.html).

So, you get great code cleanliness with AMD, reduced file sizes, and easy integration for other developers who may not use AMD.

## Restrictions

**Note:** Same restrictions as almond.js, plus a few more

It is best used for libraries or apps that use AMD and:

* optimize all the modules into one file -- no dynamic code loading.
* include `path` alias names for each module using the `require.config()` method.
* do not use AMD loader plugins (e.g. text! plugin)
* only have **one** require.config() call.

##What is Supported

* define() and require() calls.

## Download

Node - npm install amdclean

Web - [Latest release](https://github.com/gfranko/amdclean/src/amdclean.js)


## Usage

1.  [Download the RequireJS optimizer](http://requirejs.org/docs/download.html#rjs).

2.  npm install amdclean

3.  Update the `onBuildWrite` property in your RequireJS build configuration.  Like this:

```javascript
    onBuildWrite: function (moduleName, path, contents) {
        return require('amdclean').clean(contents);
    }
```

4.  Run the optimizer using [Node](http://nodejs.org) (also [works in Java](https://github.com/jrburke/r.js/blob/master/README.md)).  More details can be found in the the r.js repo.
