/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Ad-hoc LB-Attachment to the Material
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
	"sap/ui/base/Object",
	"sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (UI5Object, MessageBox, Filter, FilterOperator) {

	"use strict";

	return UI5Object.extend("z.adhoclbtomat.controller.ErrorHandler", {

        constructor : function (oComponent) {
            var oMessageManager = sap.ui.getCore().getMessageManager(),
                oMessageModel = oMessageManager.getMessageModel(),
                oResourceBundle = oComponent.getModel("i18n").getResourceBundle(),
                sErrorText = oResourceBundle.getText("errorText"),
                sMultipleErrors = oResourceBundle.getText("multipleErrorsText");

            this._oComponent = oComponent;
            this._bMessageOpen = false;

            this.oMessageModelBinding = oMessageModel.bindList("/", undefined,
                [], new Filter("technical", FilterOperator.EQ, true));

            this.oMessageModelBinding.attachChange(function (oEvent) {
                var aContexts = oEvent.getSource().getContexts(),
                    aMessages = [],
                    sErrorTitle;

                if (this._bMessageOpen || !aContexts.length) {
                    return;
                }

                // ---- Extract and remove the technical messages
                aContexts.forEach(function (oContext) {
                    aMessages.push(oContext.getObject());
                });
                oMessageManager.removeMessages(aMessages);

                // ---- Due to batching there can be more than one technical message. However the UX
                // ---- guidelines say "display a single message in a message box" assuming that there
                // ---- will be only one at a time.
                sErrorTitle = aMessages.length === 1 ? sErrorText : sMultipleErrors;

                this._showServiceError(sErrorTitle, aMessages[0].message);
            }, this);
        },

        _showServiceError : function (sErrorTitle, sDetails) {
            this._bMessageOpen = true;

            // this.handleODataRequestFailed(sErrorMessages, sErrorTitle, bErrorDetails); 

            // MessageBox.error(
            //     sErrorTitle,
            //     {
            //         id : "serviceErrorMessageBox",
            //         details: sDetails,
            //         styleClass: this._oComponent.getContentDensityClass(),
            //         actions: [MessageBox.Action.CLOSE],
            //         onClose: function () {
            //             this._bMessageOpen = false;
            //         }.bind(this)
            //     }
            // );
        }

	});
});