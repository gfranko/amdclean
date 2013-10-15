// MobileInit.js
// -------------

// Include Mobile Specific JavaScript files here (or inside of your Mobile router)
require(['jquery', 'backbone', 'routers/router'],

  function($, Backbone, MobileRouter) {

    // Instantiates a new Mobile Router instance
    new MobileRouter();

  }

);