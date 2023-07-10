/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Warehouse task from HHU
 ************************************************************************
 * Authorization  : Checked by backend
 ************************************************************************
 * Code-Inspector : 
 ************************************************************************
 * Changed by     :
 * WR/CR number   :
 * Change         :
 ************************************************************************/


 sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/base/Log"
], function (Controller, History, MessageToast, Log) {

	"use strict";

	return Controller.extend("z.wafromhhu.controller.BaseController", {

		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		disableDefaultErrorHandler: function (bDefault) {
			this.getOwnerComponent()._oErrorHandler._bMessageOpen = bDefault;
		},

		// ---- Show error message (try-catch)
		showErr: function (oErr) {
			try {
				MessageToast.show(oErr.message);
				
				Log.error(oErr);
			} catch (oErrX) {
				MessageToast.show(oErrX.message);
				
				Log.error(oErrX);
			}
		},
		
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("main", {}, true);
			}
		}

	});
});