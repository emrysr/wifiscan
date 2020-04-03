cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-networkinterface.networkinterface",
      "file": "plugins/cordova-plugin-networkinterface/www/networkinterface.js",
      "pluginId": "cordova-plugin-networkinterface",
      "clobbers": [
        "window.networkinterface"
      ]
    },
    {
      "id": "es6-promise-plugin.Promise",
      "file": "plugins/es6-promise-plugin/www/promise.js",
      "pluginId": "es6-promise-plugin",
      "runs": true
    },
    {
      "id": "wifiwizard2.WifiWizard2",
      "file": "plugins/wifiwizard2/www/WifiWizard2.js",
      "pluginId": "wifiwizard2",
      "clobbers": [
        "window.WifiWizard2"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-plugin-whitelist": "1.3.4",
    "cordova-plugin-browsersync": "0.1.7",
    "cordova-plugin-networkinterface": "2.0.2",
    "es6-promise-plugin": "4.1.0",
    "wifiwizard2": "3.1.1"
  };
});