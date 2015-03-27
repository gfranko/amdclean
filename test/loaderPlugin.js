/**
 * loader plugin with relative paths in dependency
 */
define('text!ui/page.html',[],function () { return '<div/>'; });
define('js/page1',["text!../ui/page.html"], function(page) {
    return page + "done";
});