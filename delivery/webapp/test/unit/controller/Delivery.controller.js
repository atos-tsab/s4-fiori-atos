/*global QUnit*/

sap.ui.define([
	"z/delivery/controller/Delivery.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Delivery Controller");

	QUnit.test("I should test the Delivery controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
