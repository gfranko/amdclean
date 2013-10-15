// Require.js Configurations
// -------------------------
require.config({

  // Sets the js folder as the base directory for all future relative paths
  baseUrl: 'js/app',

  // 3rd party script alias names (Easier to type 'jquery' than 'libs/jquery, etc')
  // probably a good idea to keep version numbers in the file names for updates checking
  paths: {

      // Core Libraries
      // --------------
      'jquery': '../libs/jquery',

      'underscore': '../libs/lodash',

      'backbone': '../libs/backbone',

      // Plugins
      // -------

      'bootstrap': '../libs/plugins/bootstrap',

      'codemirror': '../libs/plugins/codemirror',

      'codemirror_javascript': '../libs/plugins/codemirror.javascript',

      'codemirror_closebrackets': '../libs/plugins/codemirror.closebrackets',

      'codemirror_matchbrackets': '../libs/plugins/codemirror.matchbrackets',

      'esprima': '../libs/plugins/esprima',

      'estraverse': '../libs/plugins/estraverse',

      'escodegen': '../libs/plugins/escodegen',

      'amdclean': '../libs/plugins/amdclean'

  },

  // Sets the configuration for your third party scripts that are not AMD compatible
  shim: {

      // Backbone
      'backbone': {

        // Depends on underscore/lodash and jQuery
        'deps': ['underscore', 'jquery'],

        // Exports the global window.Backbone object
        'exports': 'Backbone'

      },

      // CodeMirror Plugins
      'codemirror_javascript': ['codemirror'],
      'codemirror_closebrackets': ['codemirror'],
      'codemirror_matchbrackets': ['codemirror']

  }

});