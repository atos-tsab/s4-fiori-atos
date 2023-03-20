/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Erfassung WE-Fremd
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
	"z/recweforeign/utils/tools",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (UI5Object, MessageBox, tools, Filter, FilterOperator) {

	"use strict";

	return UI5Object.extend("z.recweforeign.controller.ErrorHandler", {

        // ---- Implementation of an utility toolset for generic use
        tools: tools,


        constructor : function (oComponent) {
            var oMessageManager = sap.ui.getCore().getMessageManager(),
                oMessageModel   = oMessageManager.getMessageModel(),
                oResourceBundle = oComponent.getModel("i18n").getResourceBundle(),
                sErrorText      = oResourceBundle.getText("errorText"),
                bErrorDetails   = false,
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
                sErrorTitle   = aMessages.length === 1 ? sErrorText : sMultipleErrors;
                bErrorDetails = aMessages.length === 1 ? false : true;

                if (bErrorDetails) {
                    this._showServiceError(sErrorTitle, aMessages, bErrorDetails);
                } else {
                    this._showServiceError(sErrorTitle, aMessages[0].message, bErrorDetails);
                }
            }, this);
        },

        _showServiceError : function (sErrorTitle, sErrorMessages, bErrorDetails) {
            this._bMessageOpen = true;

            // tools.handleODataRequestFailed(sErrorTitle, sErrorMessages, bErrorDetails, this._bMessageOpen); 

            MessageBox.error(
                sErrorTitle,
                {
                    id : "serviceErrorMessageBox",
                    details: sDetails,
                    styleClass: this._oComponent.getContentDensityClass(),
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function () {
                        this._bMessageOpen = false;
                    }.bind(this)
                }
            );
        }

	});
});