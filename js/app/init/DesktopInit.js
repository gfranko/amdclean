// DesktopInit.js
// --------------
// Includes Desktop Specific JavaScript files here (or inside of your Desktop router)
require(['jquery', 'backbone', 'routers/router'],

  function($, Backbone, DesktopRouter) {

    // Instantiates a new Desktop Router instance
    new DesktopRouter();

  }

);