/*global QUnit*/

sap.ui.define([
	"z/qbased_ware_proc/controller/QbasedProcWare.controller"
], function (Controller) {
	"use strict";

	QUnit.module("QbasedProcWare Controller");

	QUnit.test("I should test the QbasedProcWare controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
