/**
 * loader plugin with relative paths in dependency
 */
var text_ui_pagehtml, js_page1, page1;
text_ui_pagehtml = '<div/>';
js_page1 = function (page) {
  return page + 'done';
}(text_ui_pagehtml);
page1 = function (page) {
  return page + 'done';
}(text_ui_pagehtml);