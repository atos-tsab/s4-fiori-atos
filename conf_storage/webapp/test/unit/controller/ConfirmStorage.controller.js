/*global QUnit*/

sap.ui.define([
	"z/conf_storage/controller/ConfirmStorage.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ConfirmStorage Controller");

	QUnit.test("I should test the ConfirmStorage controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
