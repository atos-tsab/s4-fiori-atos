/*global QUnit*/

sap.ui.define([
	"z/rec_we_foreign/controller/RecWeForeign.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RecWeForeign Controller");

	QUnit.test("I should test the RecWeForeign controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
