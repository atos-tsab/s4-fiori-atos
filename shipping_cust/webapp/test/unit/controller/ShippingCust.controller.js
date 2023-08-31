/*global QUnit*/

sap.ui.define([
	"z/shipping_cust/controller/ShippingCust.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ShippingCust Controller");

	QUnit.test("I should test the ShippingCust controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
