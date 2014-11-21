/* istanbul ignore next */
var pubnub;
pubnub = function (exports) {
  'use strict';
  /**
   * @alias core.pubnub.Mock
   * @type {PUBNUB}
   */
  exports = {
    ws: function (url) {
      this.pubnub = {
        ready: function () {
        }
      };
      this.onmessage = function () {
      };
      this.onclose = function () {
      };
      this.onerror = function () {
      };
      this.onopen = function () {
      };
      // multi
      // line
      // comment
      this.close = function (code, reason) {
        this.onclose({
          code: code,
          reason: reason,
          wasClean: true
        });
      };
      /**
       * This stub allows to simulate message arrival
       * @param data
       */
      this.receiveMessage = function (data) {
        this.onmessage({ data: data });
      };
      this.onopen();
    }
  };
  return exports;
}();