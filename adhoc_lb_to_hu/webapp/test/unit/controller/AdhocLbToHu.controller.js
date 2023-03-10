/*global QUnit*/

sap.ui.define([
	"z/adhoc_lb_to_hu/controller/AdhocLbToHu.controller"
], function (Controller) {
	"use strict";

	QUnit.module("AdhocLbToHu Controller");

	QUnit.test("I should test the AdhocLbToHu controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
