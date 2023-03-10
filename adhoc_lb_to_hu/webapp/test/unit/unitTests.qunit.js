/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"z/adhoc_lb_to_hu/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
