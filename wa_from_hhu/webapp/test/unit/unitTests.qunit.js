/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"z/wa_from_hhu/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
