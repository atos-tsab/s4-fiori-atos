/*global QUnit*/

sap.ui.define([
	"z/store_we_ws/controller/StoreWeQs.controller"
], function (Controller) {
	"use strict";

	QUnit.module("StoreWeQs Controller");

	QUnit.test("I should test the StoreWeQs controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
