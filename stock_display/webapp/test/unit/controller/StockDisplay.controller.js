/*global QUnit*/

sap.ui.define([
	"z/stock_display/controller/StockDisplay.controller"
], function (Controller) {
	"use strict";

	QUnit.module("StockDisplay Controller");

	QUnit.test("I should test the StockDisplay controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
