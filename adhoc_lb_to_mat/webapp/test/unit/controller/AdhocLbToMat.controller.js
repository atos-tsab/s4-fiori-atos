/*global QUnit*/

sap.ui.define([
	"z/adhoc_lb_to_mat/controller/AdhocLbToMat.controller"
], function (Controller) {
	"use strict";

	QUnit.module("AdhocLbToMat Controller");

	QUnit.test("I should test the AdhocLbToMat controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
