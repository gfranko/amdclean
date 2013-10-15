/* DownloadBuilder.js - v0.6.0 - 2012-12-12
* http://www.gregfranko.com/downloadBuilder.js/
* Copyright (c) 2012 Greg Franko; Licensed MIT */

// Immediately-Invoked Function Expression (IIFE) [Ben Alman Blog Post](http://benalman.com/news/2010/11/immediately-invoked-function-expression/) that calls another IIFE that contains all of the plugin logic.  I use this pattern so that anyone viewing this code does not have to scroll to the bottom of the page to view the local parameters that are passed into the main IIFE.
(function (downloadBuilder) {

    //ECMAScript 5 Strict Mode: [John Resig Blog Post](http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/)
    "use strict";

    // Calls the second IIFE and locally passes in the global window, and document objects
    downloadBuilder(window, document);

}

// Locally passes in the `window` object, the `document` object, and an `undefined` variable.  The `window` and `document` objects are passed in locally, to improve performance, since javascript first searches for a variable match within the local variables set before searching the global variables set.  All of the global variables are also passed in locally to be minifier friendly. `undefined` can be passed in locally, because it is not a reserved word in JavaScript.
(function (window, document, undefined) {

    // ECMAScript 5 Strict Mode: [John Resig Blog Post](http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/)
    "use strict";

    // Function object constructor
    var DownloadBuilder = function(obj) {

        // Sets the library options
        this.options = {

            // Location option (Defaults to an local)
            "location": (obj && obj.location) || "local",

            // Github author name option
            "author": (obj && obj.author) || "",

            // Github repo name option
            "repo": (obj && obj.repo) || "",

            // Github branch option
            "branch": (obj && obj.branch) || "",

            // Github client id
            "client_id": (obj && obj.client_id) || "",

            // Github client secret
            "client_secret": (obj && obj.client_secret) || ""

        };

        // Cache option (defaults to an hour (in milliseconds))
        if(obj && obj.cache !== undefined) {

            this.options.cache = +obj.cache;

        }

        else {

            this.options.cache = 3600000;

        }

        // Sets up the plugin
        this._create();

    };

    // Adds methods to the downloadBuilder prototype object that are shared between all instances
    DownloadBuilder.prototype = {

        // Library Version Number
        VERSION: "0.6.0",

        //Github Rate Limit URL
        githubRateLimitUrl: "https://api.github.com/rate_limit",

        // String that will be used to hold the file content
        file: "",

        // Number of the current checkbox that is being traversed
        currentCheckbox: 0,

        // Checkbox HTML elements
        checkboxes: [],

        // Callback function that is called when the fileURL creation process is complete
        callback: function() {},

        // _Create
        // -------
        //      Sets up the Library.
        _create: function() {

            // Determines if the current browser supports the HTML5 Filesystem API and sets up some global variables needed for the HTML5 filesystem to work
            this.supportsFilesystem = this.fileSystemSupport();

            // Instance variable (object) that determines if a user is trying to use a Github resource and how many Github resources are being used
            this.github = this._isUsingGithub();

            // If one or more Github resources are trying to be used
            if(this.github.isUsing) {

                // Checks to make sure the user is not over the Github rate limiting capacity and sets an instance property to the number of remaining available Github requests
                this._checkGithubRateLimit();

            }

            // Maintains chainability
            return this;

        },

        // _fileSystemSetup
        // ----------------
        //      Sets up the HTML5 Filesystem global variables and determines if the current browser supports the API
        fileSystemSupport: function() {

            // HTML5 Filesystem API Variables
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem || window.mozRequestFileSystem;

            window.URL = window.URL || window.webkitURL || window.mozURL;

            window.storageInfo = window.storageInfo || navigator.webkitTemporaryStorage || window.mozStorageInfo;

            // If any of the global HTML5 Filesystem variables are not available
            if(!window.requestFileSystem || !window.Blob || !window.URL || !window.storageInfo) {

                // The HTML5 Filesystem API is not supported
                return false;

            }

            // The HTML5 Filesystem API is supported
            return true;

        },

        // _isUsingGithub
        // --------------
        //      Determines if any of the file downloads are trying to use Github
        _isUsingGithub: function() {

            // Grabs all of the elements on the page with the data-location='github' HTML5 data attribute
            var githubSelector = document.querySelectorAll('[data-location="github"]');

            // If there is one element or more that are trying to use Github resources
            if(githubSelector.length || this.options.location === "github") {

                // Returns an object
                return { "isUsing": true, "length": githubSelector.length };

            }

            // If there are no elements that are trying to use Github resources
            else {

                // Returns an object
                return { "isUsing": false, "length": githubSelector.length };

            }

        },

        // _checkGithubRateLimit
        // ---------------------
        //      Determines if the number of Github HTTP requests has hit the maximum number of requests, within the hour, that Github allows before rate limiting
        _checkGithubRateLimit: function() {

            // Saves the Library object context in the this variable
            var self = this;

            // Calls the custom JSONP method (created by Oscar Goodson)
            this.JSONP(this.githubRateLimitUrl + "?client_id=" + this.options.client_id + "&client_secret=" + this.options.client_secret, function(data){
        
                // Sets an instance variable that determines if the Github rate limit has been reached or not
                self.rateLimit = data.data.rate.remaining;

            });

            // Maintains chainability
            return this;

        },

        // JSONP
        // -----
        //      Method created by Oscar Goodson [Github](https://github.com/OscarGodson/JSONP)
        JSONP: function(url,method,callback) {
    
            // Set the defaults
            url = url || "";
    
            method = method || "";
  
            callback = callback || function(){};

            var jsonpScript,
                generatedFunction;
  
            // If no method was set and they used the callback param in place of
            // the method param instead, we say method is callback and set a
            // default method of "callback"
            if(typeof method === "function") {

                callback = method;

                method = "callback";
    
            }
  
            // This randomizes a function *name* for generated script tag at the bottom to call
            // example: jsonp958653
            generatedFunction = "jsonp" + Math.round(Math.random()*1000001);
  
            // Generate the temp JSONP function using the name above
            // First, call the function the user defined in the callback param [callback(json)]
            // Then delete the generated function from the window [delete window[generatedFunction]]
            window[generatedFunction] = function(json){
           
                callback(json);
        
                // A try/catch block is used because IE8 does not support deleting global window properties
                try {

                    delete window[generatedFunction];
                    
                }

                catch (e) {

                    window[generatedFunction] = undefined;

                }
    
            };
  
            // Check if the user set their own params, and if not add a ? to start a list of params
            // If in fact they did we add a & to add onto the params
            // example1: url = http://url.com THEN http://url.com?callback=X
            // example2: url = http://url.com?example=param THEN http://url.com?example=param&callback=X
            if(url.indexOf("?") === -1) {

                url = url+"?";

            }
    
            else { 

                url = url+"&";

            }
  
            // This generates the script tag
            jsonpScript = document.createElement("script");

            jsonpScript.setAttribute("src", url + method + "=" + generatedFunction);

            document.getElementsByTagName("head")[0].appendChild(jsonpScript);
        },

        // buildURL
        // --------
        //      Downloads all of the files listed in the checkbox attributes,
        //      concatenates all files into a single file,
        //      constructs a file url (if supported),
        //      and calls the callback function when everything is complete
        buildURL: function(checkboxes, fileName, lang, callback) {

            // If there is at least one checkbox element
            if(checkboxes.length) {

                // LOCAL VARIABLES
                var self = this,
                    time = new Date().getTime(),
                    currentElem,
                    location,
                    repoAuthor,
                    repoName,
                    repoBranch,
                    localPath,
                    x,
                    lastElem;

                // If the callback parameter is a function
                if(typeof callback === "function") {

                    // Saves the callback function as an object instance property
                    self.callback = callback;

                }

                if(self.currentCheckbox === 0 && window.sessionStorage && !window.sessionStorage.getItem("cache-time")) {

                    window.sessionStorage.setItem("cache-time", time);

                }

                // Saves the checkbox elements as an object instance property
                self.checkboxes = checkboxes;

                // Determines if the currently traversed checkbox element is the last checkbox element in the list
                lastElem = (self.currentCheckbox === checkboxes.length -1) || false;

                // Stores the currently traversed checkbox element in a variable
                currentElem = checkboxes[self.currentCheckbox];

                // Stores the HTML5 data attribute, data-location, inside of a variable (Defaulting to local)
                location = currentElem.getAttribute("data-location") || self.options.location || "";

                // Stores the HTML5 data attribute, data-author, inside of a variable (Defaulting to an empty string)
                repoAuthor = currentElem.getAttribute("data-author") || self.options.author || "";

                // Stores the HTML5 data attribute, data-repo, inside of a variable (Defaulting to an empty string)
                repoName = currentElem.getAttribute("data-repo") || self.options.repo || "";

                // Stores the HTML5 data attribute, data-branch, inside of a variable (Defaulting to an empty string)
                repoBranch = currentElem.getAttribute("data-branch") || self.options.branch || "";

                // Stores the HTML5 data attribute, data-localpath, inside of a variable (Defaulting to an empty string)
                localPath = currentElem.getAttribute("data-localpath") || "";

                // If the current browser supports Session Storage
                if(window.sessionStorage) {

                    // If there are already items stored in the session
                    if(window.sessionStorage.getItem(currentElem.value) && window.sessionStorage.getItem("cache-time")) {

                         // If the caching time has expired
                        if((time - window.sessionStorage.getItem("cache-time")) >= self.options.cache) {

                            // Removes the session data
                            window.sessionStorage.removeItem(currentElem.value);

                            // Removes the session data
                            window.sessionStorage.removeItem("cache-time");

                            // Requests new data
                            self._sendRequest({ "location": location, "repoAuthor": repoAuthor, "repoName": repoName, "repoBranch": repoBranch, "localPath": localPath, "currentElem": currentElem, "time": time, "lastElem": lastElem, "fileName": fileName, "lang": lang });

                        }

                        // If the caching time has not expired
                        else {

                            // Appends to the file instance property with whatever text is already in the session
                            self.file += window.sessionStorage.getItem(currentElem.value);

                            // Checks to the see if the file URL is ready to be created
                            self._fileStatus({ "lastElem": lastElem, "lang": lang, "fileName": fileName });

                        }

                    }

                    // If there are no items in the session
                    else {

                        // Requests new data
                        self._sendRequest({ "location": location, "repoAuthor": repoAuthor, "repoName": repoName, "repoBranch": repoBranch, "localPath": localPath, "currentElem": currentElem, "time": time, "lastElem": lastElem, "fileName": fileName, "lang": lang });

                    }
                    
                }

            }

            else {

                // Calls the callback function that was ininitially passed into the buildURL method
                callback.call(window, { "content": "", "fileName": fileName, "lang": lang });

            }

            // Maintains chainability
            return this;

        },

        // _localRequest
        // -------------
        //      Downloads the text of a local file
        _localRequest: function(obj) {

            // LOCAL VARIABLES
            var self = this,
                xhr,
                text;

            // Ajax Request wrapped in a try/catch block in case of an error
            try {
    
                // Constructs a new XMLHttpRequest object instance
                xhr = new XMLHttpRequest();

                // Creates a GET request with the relative url that is passed
                xhr.open("GET", obj.url, true);

                // Ajax event handler to check if the request is finished
                xhr.onreadystatechange = function(e) {
  
                    // If the Ajax request is complete and it is successful
                    if (this.readyState === 4 && this.status === 200) {
    
                        // Save the text response in a local variable
                        text = this.responseText || this.response || "";

                        // If the file is empty
                        if(!self.file) {

                            // Append the text response to the file instance property
                            self.file += text;

                        }

                        else {

                            // Append a newline and a text response to the file instance property
                            self.file += "\n" + text;

                        }

                        // Sets necessary session data
                        window.sessionStorage.setItem(obj.elem.value, text || "");

                        // Checks to the see if the file URL should be created yet
                        self._fileStatus({ "lastElem": obj.lastElem, "lang": obj.lang, "fileName": obj.fileName });

                    }
                };

                // Sends the Ajax request
                xhr.send();

            } catch(error) {

            }

            // Maintains chainability
            return this;

        },

        // _thirdPartyRequest
        // ------------------
        //      Downloads the text of a third-party file (Currently only Github is supported)
        _thirdPartyRequest: function(obj) {

            // Stores the local object context in the self local variable
            var self = this,
                text;

            // Calls the custom JSONP method (created by Oscar Goodson)
            this.JSONP(obj.url, function(data) {
        
                // If the request is a Github request
                if(obj.type === "github") {

                    // Appends the parsed Github text response to the file instance property
                    text = self._parseGithubResponse({ "elem": obj.elem, "data": data }) || "";

                    // If the file is empty
                    if(!self.file) {

                        // Append the text response to the file instance property
                        self.file += text;

                    }

                    else {

                        // Append a newline and a text response to the file instance property
                        self.file += "\n" + text;

                    }

                    // Stores all the necessary data inside of the session
                    window.sessionStorage.setItem(obj.elem.value, text || "");

                    // Checks to the see if the file URL is ready to be created
                    self._fileStatus({ "lastElem": obj.lastElem, "lang": obj.lang, "fileName": obj.fileName });

                }

            });

        },

        // _sendRequest
        // ------------
        //      Determines what type of request (local or third party) is sent
        _sendRequest: function(obj) {

            // If the request is a Github request
            if(obj.location === "github") {

                // If the Github rate limit has not been met
                if(this.rateLimit !== 0) {

                    // Decreases the rate limit capacity amount
                    this.rateLimit -= 1;

                    // Sends a third party file request
                    this._thirdPartyRequest({ "type": obj.location, "url": "https://api.github.com/repos/" + obj.repoAuthor + "/" + obj.repoName + "/contents/?ref=" + obj.repoBranch + "&path=" + obj.currentElem.value + "&client_id=" + this.options.client_id + "&client_secret=" + this.options.client_secret, "elem": obj.currentElem, "time": obj.time, "lastElem": obj.lastElem, "lang": obj.lang, "fileName": obj.fileName });

                }

                // If the Github rate limit has been met
                else {

                    // If a backup local path is provided
                    if(obj.localPath) {

                        // Sends a local file request
                        this._localRequest({ "url": obj.localpath, "elem": obj.currentElem, "time": obj.time, "lastElem": obj.lastElem, "lang": obj.lang, "fileName": obj.fileName });

                    }

                }

            }

            // If the request is not a Github request
            else {

                // Sends a local file request
                this._localRequest({ "url": obj.currentElem.value, "elem": obj.currentElem, "time": obj.time, "lastElem": obj.lastElem, "lang": obj.lang, "fileName": obj.fileName });
                                
            }

        },

        // _parseGithubResponse
        // --------------------
        //      Parses the Base 64 encoded Github response into text
        //      This method was heavily inspired by [James Ward](https://github.com/jamesward/github-files)
        _parseGithubResponse: function(obj) {

            // LOCAL VARIABLES
            var self = this,
                base64EncodedContent,
                content,
                contentArray,
                text;

            // If Github found content and the global `atob` method is available (not currently available in IE)
            if (obj.data.data.content !== undefined && window.atob) {

                // If the encoding is base64
                if (obj.data.data.encoding === "base64") {

                    // Stores the content property inside of the local variable
                    base64EncodedContent = obj.data.data.content;

                    // Removes all new lines
                    base64EncodedContent = base64EncodedContent.replace(/\n/g, "");
    
                    // Stores the base64 encoded content inside of a local variable
                    content = window.atob(base64EncodedContent);
    
                    // Splits the content up into an array
                    contentArray = content.split("\n");

                    // Grabs all of the content from the array and stores the text in a local variable
                    text = contentArray.slice(0, contentArray.length).join("\n") || "";

                }

            }

            // Maintains chainability
            return text;

        },

        // createURL
        // ---------
        //      Constructs a file url using the HTML5 Filesystem API (Only currently available in Chrome 12+)
        createURL: function(obj) {

            // LOCAL VARIABLES
            var self = this,
                blob;
            // Request temporary storage data (even though we are not creating any files this step is necessary)
            window.storageInfo.requestQuota(1024*1024, function(grantedBytes) {

                // The callback function that uses the granted bytes requested in the previous callback
                window.requestFileSystem(self.storageType, grantedBytes, function(fs) {

                    // Creates a file (the name of the file is passed into the createURL method)
                    fs.root.getFile(obj.fileName, { create: true }, function(fileEntry) {

                        // Create a FileWriter object for our FileEntry
                        fileEntry.createWriter(function(fileWriter) {

                            // Create a new Blob
                            blob = new window.Blob([obj.data], { type: "text/" + obj.lang });

                            // Calls the callback function that was passed in, and constructs then passes the url that references the recently created blob
                            obj.callback.call(window, window.URL.createObjectURL(blob));

                        });

                    });    

                });

            });

            // Maintains chainability
            return this;

        },

        // _fileStatus
        // -----------
        //      Determines if the file URL is ready to be created
        _fileStatus: function(obj) {

            // LOCAL VARIABLES
            var self = this,
                url;

            // If the last checkbox is being process
            if(obj.lastElem) {

                // Resets the currently traversed checkbox back to zero
                this.currentCheckbox = 0;

                // If the current browser supports the HTML5 Filesystem API
                if(self.supportsFilesystem) {

                    // Creates the file URL
                    self.createURL({ "lang": obj.lang, "fileName": obj.fileName, "data": self.file, "callback": function(url) {

                        // Saves the url inside of the session
                        window.sessionStorage.setItem("bloburl", url);

                        // Calls the callback function that was ininitially passed into the buildURL method
                        self.callback.call(window, { "url": url, "content": self.file, "fileName": obj.fileName, "lang": obj.lang });

                        // Removes the contents of the file instance property (that was used to create the file URL)
                        self.file = "";

                    }});

                }

                // If the current borwser does not support the HTML5 Filesystem API
                else {

                    // Calls the callback function that was ininitially passed into the buildURL method
                    self.callback.call(window, { "content": self.file, "fileName": obj.fileName, "lang": obj.lang });

                    // Removes the contents of the file instance property (that was used to create the file URL)
                    self.file = "";

                }

            }

            // If the last checkbox is not being processed
            else {

                // Increment the currently traversed checkbox number
                this.currentCheckbox += 1;

                // Call the buildURL method again
                self.buildURL(self.checkboxes, obj.fileName, obj.lang, self.callback);

            }

            // Maintains chainability
            return this;

        }

    };

    // Makes the local downloadBuilder object global
    window.DownloadBuilder = DownloadBuilder;

})); // End of Library