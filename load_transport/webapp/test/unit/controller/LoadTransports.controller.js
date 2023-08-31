/*global QUnit*/

sap.ui.define([
	"z/load_transport/controller/LoadTransports.controller"
], function (Controller) {
	"use strict";

	QUnit.module("LoadTransports Controller");

	QUnit.test("I should test the LoadTransports controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
