/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"z/qbased_ware_proc/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
