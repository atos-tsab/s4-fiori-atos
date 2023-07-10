/*global QUnit*/

sap.ui.define([
	"z/re_arrangem/controller/ReArrangements.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ReArrangements Controller");

	QUnit.test("I should test the ReArrangements controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
