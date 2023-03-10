/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"z/store_we_ws/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
