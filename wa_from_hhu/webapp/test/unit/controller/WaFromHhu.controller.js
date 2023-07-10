/*global QUnit*/

sap.ui.define([
	"z/wa_from_hhu/controller/WaFromHhu.controller"
], function (Controller) {
	"use strict";

	QUnit.module("WaFromHhu Controller");

	QUnit.test("I should test the WaFromHhu controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
