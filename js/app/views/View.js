// View.js
// -------
define(['jquery',
    'backbone',
    'underscore',
    'amdclean',
    'esprima',
    'codemirror_javascript',
    'codemirror_closebrackets',
    'codemirror_matchbrackets'],

    function($, Backbone, _, amdclean, esprima) {

        var View = Backbone.View.extend({

            el: 'body',

            // View constructor
            initialize: function() {

                var urlCode = this.getParameter('code');

                this.amdTextarea = $('#amd-textarea');

                this.standardTextarea = $('#standard-textarea');

                this.autoRunJS = $('#auto-run-checkbox');

                this.globalObject = $('#global-object-checkbox');

                this.standardTextarea.val(amdclean.clean({
                    'code': this.amdTextarea.val(),
                    'globalObject': this.globalObject.is(':checked') ? true : false,
                    'rememberGlobalObject': false,
                    'escodegen': {
                        'format': {
                            'indent': {
                                'adjustMultilineComment': true
                            }
                        }
                    }
                }));

                this.amdEditor = CodeMirror.fromTextArea(document.getElementById('amd-textarea'), {
                    mode: 'javascript',
                    tabMode: 'indent',
                    lineNumbers: true,
                    matchBrackets: true,
                    theme: 'xq-light',
                    autoCloseBrackets: true
                });

                this.standardEditor = CodeMirror.fromTextArea(document.getElementById('standard-textarea'), {
                    mode: 'javascript',
                    tabMode: 'indent',
                    lineNumbers: true,
                    readOnly: true,
                    cursorHeight: 0
                });

                this.amdEditor.on('change', _.bind(function () {
                    if(this.autoRunJS.is(':checked')) {
                        this.optimizeCode();
                    }
                }, this));

                this.codeError = $('.code-error');

                this.linkToShare = $('#link-to-share');

                this.linkToShareContainer = $('.link-to-share-container');

                if(urlCode) {
                    this.amdEditor.setValue(window.escodegen.generate(esprima.parse(decodeURIComponent(urlCode))));
                }

            },

            // View Event Handlers
            events: {
                'click .clean-btn': 'optimizeCode',
                'click #global-object-checkbox': 'optimizeCode',
                'change #auto-run-checkbox': 'autorun',
                'click .restore-to-defaults': 'restoreToDefaults',
                'click a[href=#]': function(e) {
                    e.preventDefault();
                }
            },

            optimizeCode: function() {
                try {
                    var cleanedCode = amdclean.clean({
                        'code': $.trim(this.amdEditor.getValue()),
                        'globalObject': this.globalObject.is(':checked') ? true : false,
                        'rememberGlobalObject': false,
                        'escodegen': {
                            'format': {
                                'indent': {
                                    'adjustMultilineComment': true
                                }
                            }
                        }
                    });
                    this.standardEditor.setValue(cleanedCode);
                    this.codeError.empty().hide();
                    this.linkToShare.val(this.buildURL());
                    this.linkToShareContainer.fadeIn();
                } catch(e) {
                    if(e.lineNumber && e.column && e.description) {
                        this.codeError.html('Description: ' + e.description + '<br><br>Line Number: ' + e.lineNumber + '<br><br>Column: ' + e.column).show();
                        this.standardEditor.setValue('');
                    }
                }
            },

            getParameter: function (paramName) {
              var searchString = window.location.search.substring(1),
                  i, val, params = searchString.split("&");

              for (i=0;i<params.length;i++) {
                val = params[i].split("=");
                if (val[0] == paramName) {
                  return val[1];
                }
              }
              return null;
            },

            autorun: function() {
                if(this.autoRunJS.is(':checked')) {
                    this.optimizeCode();
                }
            },

            buildURL: function() {
                return location.protocol + '//' + location.host + location.pathname + '?code=' + encodeURIComponent(this.amdEditor.getValue());
            },

            restoreToDefaults: function() {

                this.amdEditor.setValue(window.escodegen.generate(esprima.parse(decodeURIComponent(this.defaultAMDCode))));

            },

            defaultAMDCode: "define('example', [], function() {return 'Convert AMD code to standard JavaScript';});"

        });

        // Returns the View class
        return View;

    }

);