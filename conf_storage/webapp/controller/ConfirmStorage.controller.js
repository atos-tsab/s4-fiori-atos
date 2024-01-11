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
	"z/confstorage/controls/ExtScanner",
	"z/confstorage/model/formatter",
	"z/confstorage/utils/tools",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
	"sap/ui/core/library",
	"sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, CoreLibrary, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.confstorage.";
    var _fragmentPath   = "z.confstorage.view.fragments.";
	var _sAppModulePath = "z/confstorage/";

    var APP = "CONF_STOR";
	var ValueState = CoreLibrary.ValueState;
 
 
    return Controller.extend("z.confstorage.controller.ConfirmStorage", {

 		// ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools: tools,


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Init:
        // --------------------------------------------------------------------------------------------------------------------

        onInit: function () {
            this._initResourceBundle();
            this._initLocalVars();
            this._initLocalModels();
            this._initBarCodeScanner();
            this._initLocalRouting();
        },

        _initResourceBundle: function () {
            // ---- Set i18n Model on View
            var i18nModel = new ResourceModel({
                bundleName: _sAppPath + "i18n.i18n"
            });

            this.getView().setModel(i18nModel, "i18n");

            this.oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
        },

        _initLocalVars: function () {
             // ---- Define variables for the License View
            this.oView = this.getView();

            this.sWN = "";
            this.iHU = "";
            this.iBookCount      = 0;
            this.sScanType       = "";
            this.oDeliveryData   = {};
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the Input Fields
            this.InputHU       = this.byId("idInput_HU");
            this.InputQuantity = this.byId("idInput_Quantity");
            this.InputLocation = this.byId("idInput_Location");
            this.InputLocConf  = this.byId("idInput_LocConf");
        },

        _initLocalModels: function () {
            var sTitle = this.oResourceBundle.getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "Handling",
                "viewTitle":       sTitle,
                "booking":         false,
                "feedback":        false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showBooking":     false,
                "showFeedback":    true,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueManuallyNo": ""
            };

			this.oScanModel     = new JSONModel(oData);
            this.oDisplayModel  = new JSONModel();
            this.oProposalModel = new JSONModel();

            this.getView().setModel(this.oScanModel, "ScanModel");
            this.getView().setModel(this.oDisplayModel, "DisplayModel");
            this.getView().setModel(this.oProposalModel, "ProposalModel");
        },

        _initBarCodeScanner: function () {
            var that = this;

            // ---- Handle the Bar / QR Code scanning
            this.oScanner = new ExtScanner({
                settings:     true,
                valueScanned: that.onScanned.bind(that),
                decoderKey:   "text",
                decoders:     that.getDecoders(),
                models: 	  that.oModel
            });
        },

        _initLocalRouting: function () {
            // ---- Handle the routing
            this.getRouter().getRoute("main").attachPatternMatched(this._onObjectMatched, this);
        },

        // --------------------------------------------------------------------------------------------------------------------

        onBeforeRendering: function () {
        },

        onAfterRendering: function () {
            this.InputHU.onsapenter       = ((oEvent) => { this._onOkClicked(); });
            this.InputQuantity.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputLocation.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputLocConf.onsapenter  = ((oEvent) => { this._onOkClicked(); });
        },

        onExit: function () {
			if (this.byId("idButtonBook_" + APP)) { this.byId("idButtonBook_" + APP).destroy(); }

            if (this.byId("idInput_HU"))       { this.byId("idInput_HU").destroy();       }
            if (this.byId("idInput_Quantity")) { this.byId("idInput_Quantity").destroy(); }
            if (this.byId("idInput_Location")) { this.byId("idInput_Location").destroy(); }
            if (this.byId("idInput_LocConf"))  { this.byId("idInput_LocConf").destroy();  }
        },

        _onObjectMatched: function (oEvent) {
            this.sViewMode = this.oScanModel.getProperty("/viewMode");

			// ---- Enable the Function key solution
			// this._setKeyboardShortcuts();

            // ---- Get the default Page ID
            this._getShellSource();
            
            // ---- Set start constellation
            this._resetAll();
            this.loadUserData();

            // ---- Set Focus to main Input field
            this._handleFocus();
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            this._createWarehouseTask();
        },

        onPressConfirmPO: function () {
            this._confirmProductionOrder();
        },

        onPressOk: function () {
            this._onOkClicked();
        },

        onPressRefresh: function () {
            this._resetAll();
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sManNumber = oScanData.valueManuallyNo.trim();

                    this.sViewMode = oScanData.viewMode;
                    
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for DMC All parameter
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);
                        
                        this.iHU = sManNumber;

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._loadHuData(sManNumber);
                        }
                    } else if (this.sViewMode === "Quantity") {
                        this._handleQuantityData();                           
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(1, sManNumber);
                        }
                    } else if (this.sViewMode === "LocConf") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(2, sManNumber);
                        }
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _confirmProductionOrder: function () {
            var that = this;
                that.ConfirmationCount = 0;

            BusyIndicator.show(1);

            // ---- First step: Get the internal Proposal data
            this._getProposalData().then ( function (oProposalData) {
                if (oProposalData !== null && oProposalData !== undefined) {
                    let data1 = oProposalData.GetConfProposal;

                    that._createProdnOrdConfData(data1).then((oProdnOrdConfData) => {
                        if (oProdnOrdConfData !== null && oProdnOrdConfData !== undefined) {
                            that.ConfirmationCount = oProdnOrdConfData.ConfirmationCount;

                            that._updateOrderHU().then(() => {
                                BusyIndicator.hide();

                            }).catch((oError) => {
                                BusyIndicator.hide();

                                tools.showMessageError(oError.message, "");
                            })
                        }             
                    }).catch((oError) => {
                        BusyIndicator.hide();

                        tools.showMessageError(oError.message, "");
                    })
                }             
            }).catch((oError) => {
                BusyIndicator.hide();

                tools.showMessageError(oError.message, "");
            })
        },
        
        _getProposalData: function () {
			var errorMes = this.oResourceBundle.getText("errorText");
			var that = this;

            BusyIndicator.show(1);

			// ---- Get Configuration Proposal
			var oProposalData = { 
				OrderID:                   this.oDisplayModel.getProperty("/OrderId"),
				OrderOperation:            this.oDisplayModel.getProperty("/OperationId"),
				Sequence:                  this.oDisplayModel.getProperty("/SequenceId"),
				ActivityIsToBeProposed:    true,
                DateAndTimeIsToBeProposed: true,
                ConfirmationYieldQuantity: this.oDisplayModel.getProperty("/Quantity")
			};

			return new Promise((resolve, reject) => {
				try {
                    var oModel = this._getServiceUrl()[0];
                        oModel.callFunction("/GetConfProposal", { 
                            urlParameters: oProposalData, 
                            method: "POST", 
                            error: function(oError, resp) {
                                BusyIndicator.hide();

                                reject(oError);
                            },
                            success: function(oData, oResponse) {
                                resolve(oData);

                                BusyIndicator.hide();
                            }
                    });
				} catch (error) {
                    BusyIndicator.hide();

					tools.showMessageError(errorMes);
				}
			});
		},

		_createProdnOrdConfData: function (oProposalData) {
			var that = this;

            BusyIndicator.show(1);

            // ---- Set Data model for the Resources
            if (oProposalData.WorkQuantityUnit1ISOCode === "") { oProposalData.WorkQuantityUnit1SAPCode = ""; }
            if (oProposalData.WorkQuantityUnit2ISOCode === "") { oProposalData.WorkQuantityUnit2SAPCode = ""; }
            if (oProposalData.WorkQuantityUnit3ISOCode === "") { oProposalData.WorkQuantityUnit3SAPCode = ""; }
            if (oProposalData.WorkQuantityUnit4ISOCode === "") { oProposalData.WorkQuantityUnit4SAPCode = ""; }
            if (oProposalData.WorkQuantityUnit5ISOCode === "") { oProposalData.WorkQuantityUnit5SAPCode = ""; }
            if (oProposalData.WorkQuantityUnit6ISOCode === "") { oProposalData.WorkQuantityUnit6SAPCode = ""; }

            delete oProposalData.__metadata;

            var sPath = "/ProdnOrdConf2";

            // ---- Create new Production Order
			return new Promise((resolve, reject) => {
				try {
                    var oModel = this._getServiceUrl()[0];
                        oModel.create(sPath, oProposalData, {
                            error: function(oError, resp) {
                                BusyIndicator.hide();

                                reject(oError);
                            },
                            success: function(rData, oResponse) {
                                resolve(rData);

                                BusyIndicator.hide();
                            }
                        });
                } catch (error) { 
                    BusyIndicator.hide();

					tools.showMessageError(error.message);
				}
			});
		},

        _updateOrderHU: function () {
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", this.iHU);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();

                var sPath = "/OrderHU(WarehouseNumber='" + oData.WarehouseNumber + "',HandlingUnitId='" + oData.HandlingUnitId + "')";
                var urlData = {
                    "Quantity":          that.ActualQuantity,
                    "ConfirmationCount": that.ConfirmationCount
                };
                
                // ---- Create new Production Order
                return new Promise((resolve, reject) => {
                    try {
                        var oModel = this._getServiceUrl()[0];                        
                            oModel.update(sPath, urlData, {
                                method: "POST", 
                                error: function(oError, resp) {
                                    BusyIndicator.hide();

                                    that.oScanModel.setProperty("/refresh", true);

                                    tools.handleODataRequestFailed(oError, resp, true);
                                },
                                success: function(rData, oResponse) {
                                    // ---- Check for complete final booking
                                    if (rData !== null && rData !== undefined) {
                                        if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                            BusyIndicator.hide();

                                            tools.showMessageError(rData.SapMessageText, "");
                                            
                                            return;
                                        } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                            // ---- Coding in case of showing Business application Informations
                                            tools.alertMe(rData.SapMessageText, "");
                                        }
                                    }
                                    
                                    if (parseInt(oResponse.statusCode, 10) === 202 || parseInt(oResponse.statusCode, 10) === 204) {
                                        BusyIndicator.hide();

                                        that.oScanModel.setProperty("/showOk", true);
                                        that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                        // ---- Do nothing -> Good case
                                        setTimeout(function () {
                                            that._handleFeedbackData();

                                            // ---- Set Focus to main Input field
                                            that._setFocus("idInput_HU");
                                        }, tSTime);            
                                    } else {
                                        BusyIndicator.hide();

                                        tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                                    }
                                }
                            });
                    } catch (error) {
                        BusyIndicator.hide();

                        tools.showMessageError(errorMes);
                    }
                });
            } else {
                BusyIndicator.hide();

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _createWarehouseTask: function () {
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", this.iHU);
            var sPackNo  = this.oResourceBundle.getText("MaterialPackagingNo");
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();
                var sWTT  = "";

                if (oData.PsaBin) {
                    sWTT = "M";
                } else {
                    sWTT = "P";
                }
 
                var sPath   = "/WarehouseTask";
                var urlData = {
                    "WarehouseNumber":           oData.WarehouseNumber,
                    "WarehouseTaskType":         sWTT,
                    "MaterialNo":                oData.Material,
                    "MaterialPackagingNo":       sPackNo,
                    "DestinationHandlingUnitId": oData.HandlingUnitId,
                    "BookConfirm":               true,
                    "BookMoveHu":                true,
                    "TargetQuantity":            oData.Quantity,
                    "TargetQuantityUOM":         oData.UnitOfMeasurement,
                    "DestinationStorageBin":     oData.DestStorageLocation
                };

                // ---- Create new Warehouse Task
                var oModel = this._getServiceUrl()[0];                        
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);

                            that._resetQuantity();
                            that.oScanModel.setProperty("/refresh", true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus("idInput_HU");
                                    
                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 201 || parseInt(oResponse.statusCode, 10) === 204) {
                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                if (sWTT === "P") {
                                    that._createWarehouseHuMove("H");
                                } else {
                                    // ---- Do nothing -> Good case
                                    setTimeout(function () {
                                        that._resetAll();

                                        // ---- Set Focus to main Input field
                                        that._setFocus("idInput_HU");
                                    }, tSTime);            
                                }
                            } else {
                                BusyIndicator.hide();

                                tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                            }
                        }
                    });
            } else {
                BusyIndicator.hide();

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _createWarehouseHuMove: function (sWTT) {
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", this.iHU);
            var sPackNo  = this.oResourceBundle.getText("MaterialPackagingNo");
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/WarehouseTask";
                var urlData = {
                    "WarehouseNumber":           oData.WarehouseNumber,
                    "WarehouseTaskType":         sWTT,
                    "MaterialNo":                oData.Material,
                    "MaterialPackagingNo":       sPackNo,
                    "HandlingUnitId":            oData.HandlingUnitId,
                    "BookConfirm":               true,
                    "BookMoveHu":                true,
                    "TargetQuantity":            oData.Quantity,
                    "TargetQuantityUOM":         oData.UnitOfMeasurement,
                    "DestinationStorageBin":     oData.DestStorageLocation
                };

                // ---- Create new Warehouse Task
                var oModel = this._getServiceUrl()[0];                        
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);

                            that._resetQuantity();
                            that.oScanModel.setProperty("/refresh", true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    that._resetAll();
                                    that._setFocus("idInput_HU");
                                    
                                    BusyIndicator.hide();

                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 201 || parseInt(oResponse.statusCode, 10) === 204) {
                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();

                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_HU");
                                }, tSTime);            
                            } else {
                                BusyIndicator.hide();

                                tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                            }
                        }
                    });
            } else {
                BusyIndicator.hide();

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading / Set Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadUserData: function () {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sParam = encodeURIComponent("/SCWM/LGN");
            var that   = this;

            this.sWN = "";

            // ---- Read the User Data from the backend
            var sPath = "/UserParameter('" + sParam + "')";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (rData !== null && rData !== undefined && rData !== "") {
                            // ---- Check for Warehouse Number
                            if (rData.ParameterValue === "") {
                                tools.showMessageError(sWarehouseNumberErr, "");
                                
                                return;
                            }

                            that.sWN = rData.ParameterValue;

                            // ---- Get the Page ID
                            that._getShellSource();
                        }
                    }
                });
        },

	    _loadHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var that = this;

            this.sActiveHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            BusyIndicator.show(1);

            // ---- Read the HU Data from the backend
            var sPath = "/OrderHU(WarehouseNumber='" + this.sWN + "',HandlingUnitId='" + this.sActiveHU + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    success: function(rData, response) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                that._resetAll();

                                var component = that.byId("idInput_HU");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                BusyIndicator.hide();

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (rData !== null && rData !== undefined) {
                            if (rData !== "") {
                                that._setHuData(rData, sManNumber);

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var sErrMsg   = that.getResourceBundle().getText("HandlingUnitErr", sManNumber);
                                var component = that.byId("idInput_Location");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(sErrMsg, "", component);
                                } else {
                                    tools.showMessageError(sErrMsg, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");
                           }
                        }
                    }
                });
        },

	    _setHuData: function (oData, sManNumber) {
            var counter = parseInt(oData.ConfirmationCount, 10);

            // ---- Reset the Display Model
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);
            
            if (oData.Status === "I" && counter === 0) {
                this._handleHuData(sManNumber);
            } else {
                this._handleFeedbackData();
            }
        },

	    _loadStorageBinData: function (trigger, sManNumber) {
            this.sStorageBin = sManNumber.toUpperCase();

            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sErrMsg = this.oResourceBundle.getText("StorageBinErr", this.sStorageBin);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            BusyIndicator.show(1);

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("StorageBinID", sap.ui.model.FilterOperator.EQ, this.sStorageBin));

            var sPath = "/StorageBin";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, that.sStorageBin, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                // ---- Check for complete final booking
                                if (rData.results[0] !== null && rData.results[0] !== undefined && rData.results[0].SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId("idInput_Location");

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.SapMessageText, "");
                                    }

                                    BusyIndicator.hide();

                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    return;
                                } else if (rData.results[0] !== null && rData.results[0] !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];                                    
                                    
                                    if (trigger === 1) {
                                        that._setStorageBinData(data);
                                    } else {
                                        that._handleLocConfData(data.StorageBinID);
                                    }
                                }

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Location");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(sErrMsg, "", component);
                                } else {
                                    tools.showMessageError(sErrMsg, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");
                            }
                        }
                    }
                });
        },

		_setStorageBinData: function (oData) {
            var oDisplayData = this.oDisplayModel.getData();
                oDisplayData.PsaBin = oData.PsaBin;

            // ---- Set the Data for the Model and set the Model to the View
            if (this.sViewMode === "Location") {
                oDisplayData.DestStorageLocation = oData.StorageBinID;
                oDisplayData.DestStorageType     = oData.StorageType;

                this.oScanModel.setProperty("/viewLoc", false);
                this.oScanModel.setProperty("/viewMode", "LocConf");
                this.oScanModel.setProperty("/viewLocConf", true);
                this.oScanModel.setProperty("/valueManuallyNo", "");              
            }

            this.oDisplayModel.setData(oDisplayData);

            // ---- Set Focus to default Input field
            this._setFocus("idInput_LocConf");
        },

        // --------------------------------------------------------------------------------------------------------------------

		_handleHuData: function (sManNumber) {
            var sErrMesg = this.oResourceBundle.getText("ErrorHuScan", sManNumber);
            var oData = this.oDisplayModel.getData();
            var id    = "idInput_Quantity";
 
            if (oData !== null && oData !== undefined && this.sViewMode === "Handling") {
                oData.HandlingUnitId = sManNumber;
            }

            if (this.iHU !== sManNumber && this.sScanView === "Handling") {
                this.oScanModel.setProperty("/showErr", true);
                this.oScanModel.setProperty("/showErrText", sErrMesg);
                this.oScanModel.setProperty("/valueManuallyNo", "");
            } else {
                this.oScanModel.setProperty("/showErr", false);
                this.oScanModel.setProperty("/showErrText", "");
                this.oScanModel.setProperty("/valueManuallyNo", "");

                // ---- Get the Data for all not empty values
                if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                    if (this.sViewMode === "Handling") {
                        this.oDisplayModel.setProperty("/HandlingUnitId", sManNumber);

                        this.oScanModel.setProperty("/viewMat", false);
                        this.oScanModel.setProperty("/viewMode", "Quantity");
                        this.oScanModel.setProperty("/viewQuantity", true);
                    }
                }
            }

            // ---- Set Focus to main Input field
            this._setFocus(id);
		},

		_handleQuantityData: function () {
            var iQuantity = parseInt(this.oDisplayModel.getProperty("/Quantity"), 10);
            var sValMesg  = this.oResourceBundle.getText("OnlyNumericQuantities");

            var that = this;

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            if (this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                var check = tools._isNumeric(this.oScanModel.getProperty("/valueManuallyNo"));

                if (!check) {
                    this.byId("idInput_Quantity").setValueState("Error");
                    this.byId("idInput_Quantity").setValueStateText(sValMesg);

                    setTimeout(function () {
                        that.byId("idInput_Quantity").setValueState("None");
                        that.byId("idInput_Quantity").setValueStateText("");

                        that.oScanModel.setProperty("/valueManuallyNo", "");
    
                        // ---- Set Focus to main Input field
                        that._setFocus("idInput_Quantity");
                    }, 3000);            

                    return;
                } else {
                    this.byId("idInput_Quantity").setValueState("None");
                    this.byId("idInput_Quantity").setValueStateText("");
                }
                
                var iActualQuantity = parseInt(this.oScanModel.getProperty("/valueManuallyNo"), 10);
                
                if (iActualQuantity !== iQuantity) {
                    this.ActualQuantity = this.oScanModel.getProperty("/valueManuallyNo");

                    this.onQuantityScanOpen();
                } else if (iActualQuantity === iQuantity) {
                    this.ActualQuantity = this.oDisplayModel.getProperty("/Quantity");
               
                    // ---- Set Focus to default Input field
                    this.oScanModel.setProperty("/valueManuallyNo", "");
                    this._setFocus("idInput_Quantity");
                }
            } else {
                this.ActualQuantity = this.oDisplayModel.getProperty("/Quantity");
            }
           
            // ---- Set Focus to default Input field
            this.oScanModel.setProperty("/valueManuallyNo", "");
            this._setFocus("idInput_Quantity");
            this._resetQuantity();
		},

		_handleFeedbackData: function () {
            this.oScanModel.setProperty("/showOk", false);
            this.oScanModel.setProperty("/showOkText", "");
            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            this.oScanModel.setProperty("/showFeedback", false);
            this.oScanModel.setProperty("/showBooking", true);
            this.oScanModel.setProperty("/feedback", false);
            this.oScanModel.setProperty("/booking", false);
            this.oScanModel.setProperty("/ok", true);

            this.oScanModel.setProperty("/viewMat", false);
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewMode", "Location");
            this.oScanModel.setProperty("/viewLoc", true);
            this.oScanModel.setProperty("/valueManuallyNo", "");

            // ---- Set Focus to default Input field
            this._setFocus("idInput_Location");
        },

        _handleLocConfData: function (sManNumber) {
            var sErrMesg     = this.oResourceBundle.getText("ErrorBooking");
            var oDisplayData = this.oDisplayModel.getData();
            var check = false;
            var id    = "idInput_HU";

            if (oDisplayData.DestStorageLocation === sManNumber.toUpperCase()) {
                this.oDisplayModel.setProperty("/Book2StorageBinVerify", sManNumber.toUpperCase());

                check = true;
            }

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            if (check) {
                id = "idButtonBookStorage";

                this.oScanModel.setProperty("/viewMode", "Handling");
                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/refresh", true);
                this.oScanModel.setProperty("/ok", false);
                this.oScanModel.setProperty("/valueManuallyNo", "");
            } else {
                id = "idInput_Location";

                this.oScanModel.setProperty("/viewMode", "Location");
                this.oScanModel.setProperty("/viewLoc", true);
                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/refresh", true);
                this.oScanModel.setProperty("/showErr", true);
                this.oScanModel.setProperty("/showErrText", sErrMesg);
                this.oScanModel.setProperty("/valueManuallyNo", "");
            }
    
            // ---- Set Focus to default Input field
            this._setFocus(id);
        },

        onInputChanged: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var source = oEvent.getSource();
                    var key = source.getValue();
    
                    if (key !== null && key !== undefined && key !== "") {
                        key = this._removePrefix(key);

                        this.oScanModel.setProperty("/valueManuallyNo", key);
                    } else {
                       this.oScanModel.setProperty("/valueManuallyNo", "");
                    }
                }

                this._onOkClicked();
            }
        },

        onInputLiveChange: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var source = oEvent.getSource();
                    var key = source.getValue();
    
                    if (key !== null && key !== undefined && key !== "") {
                        this.oScanModel.setProperty("/valueManuallyNo", key);
                    } else {
                        this.oScanModel.setProperty("/valueManuallyNo", "");
                    }
                }
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Dialog Functions
        // --------------------------------------------------------------------------------------------------------------------

		onQuantityScanOpen: function () {
			var fragmentFile = _fragmentPath + "DialogQuantityScan";
			var oView = this.getView();
			var that = this;
			
            // ---- Starts the Bookung Dialog for Handling Units
			if (!this.getView().dialogQuantityScan) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogQuantityScan = oDialog;
					oView.dialogQuantityScan.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogQuantityScan.open();
				});
			} else {
                oView.dialogQuantityScan.open();
            }
 		},

        onQuantityScanClose: function () {
            if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.ActualQuantity = this.oDisplayModel.getProperty("/Quantity");
            this._resetQuantity();
        },

		onQuantityScanAfterClose: function () {
            this._setFocus("idInput_HU");
		},

		onQuantityScanSave: function () {
			if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.oDisplayModel.setProperty("/Quantity", this.ActualQuantity);
            this._resetQuantity();
		},


        // --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            var oScanModel = this.oScanModel;

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo").trim();
                    var sScanNumber = oEvent.getParameter("valueScan").trim();

                    this.sViewMode = oScanModel.getData().viewMode;

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for Data Matix Code
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    }

                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        // ---- Check for Data Matix Code
                        sScanNumber = this._handleDMC(this.sViewMode, sScanNumber);

                        sScanNumber = sScanNumber.toUpperCase();
                        
                        oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                        sManNumber = sScanNumber;
                    }

                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._loadHuData(sManNumber);
                        }
                    } else if (this.sViewMode === "Quantity") {
                        this._handleQuantityData();                           
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(1, sManNumber);
                        }
                    } else if (this.sViewMode === "LocConf") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(2, sManNumber);
                        }
                    }
                }    
            }
 		},

		onScan: function (sViewMode) {
            if (sViewMode !== null && sViewMode !== undefined && sViewMode !== "") {
                this.sViewMode = sViewMode;
            } else {
                this.sViewMode = this.oScanModel.getProperty("/viewMode");
            }

			this.oScanner.openScanDialog(sViewMode);
		},

		getDecoders: function () {
			var that = this;

			return [
				{
					key:     "PDF417-UII",
					text:    "PDF417-UII",
					decoder: that.parserPDF417UII,
				},
				{
					key:     "text",
					text:    "TEXT",
					decoder: that.parserText,
				},
			];
		},

		parserText: function (oResult) {
			var iLength = oResult.text.length;
			var sText = "";

			for (var i = 0; i !== iLength; i++) {
				if (oResult.text.charCodeAt(i) < 32) {
					sText += " ";
				} else {
					sText += oResult.text[i];
				}
			}

			return sText;
		},

		parserPDF417UII: function (oResult) {
			// ---- We expect that first symbol of UII (S - ASCII = 83) or it just last group
			var sText = oResult.text || "";

			if (oResult.format && oResult.format === 10) {
				var iLength = oResult.text.length;
				var aChars  = [];
				sText       = "";

				for (var i = 0; i !== iLength; i++) {
					aChars.push(oResult.text.charCodeAt(i));
				}

				var iStart     = -1;
				var iGRCounter = 0;
				var iGroupUII  = -1;
				var sTemp      = "";

				aChars.forEach(function (code, k) {
					switch (code) {
						case 30:
							if (iStart === -1) {
								iStart = k;
								sTemp  = "";
							} else {
								sText      = sTemp;
								iGRCounter = -1;
							}
							break;
						case 29:
							iGRCounter += 1;
							break;
						default:
							if (iGRCounter > 2 && code === 83 && iGRCounter > iGroupUII) {
								sTemp     = "";
								iGroupUII = iGRCounter;
							}
							if (iGroupUII === iGRCounter) {
								sTemp += String.fromCharCode(code);
							}
					}
				});
				if (sText) {
					sText = sText.slice(1);
				}
			}

			return sText;
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Navigation Functions
        // --------------------------------------------------------------------------------------------------------------------

        onNavBack: function () {
			var that = this;

            if (sap.ushell !== null && sap.ushell !== undefined) {
                if (sap.ushell.Container !== null && sap.ushell.Container !== undefined) {
                    var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                        oCrossAppNavigator.toExternal({
                            target: {
                                shellHash: that.sShellSource
                            }
                        });
                }
            }
        },

		_getShellSource: function (oEvent) {
			var spaceID = this.oResourceBundle.getText("SpaceId");
			var pageID  = this._getPageId();

            if (spaceID !== null && spaceID !== undefined && spaceID !== "" && pageID !== null && pageID !== undefined && pageID !== "") {
                this.sShellSource = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;
            } else {
                if (History.getInstance() !== null && History.getInstance() !== undefined) {
                    if (History.getInstance().getPreviousHash() !== null && History.getInstance().getPreviousHash() !== undefined) {
                        var sPreviousHash = History.getInstance().getPreviousHash();
    
                        if (sPreviousHash.includes("pageId=" + pageID + "&spaceId=Z_EEWM_SP_MOBILE_DIALOGS")) {
                            this.sShellSource = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;

                            return;
                        }
                    }    
                } 

                this.sShellSource = "#Shell-home";
            }
		},

        _getPageId: function () {
			var pageID  = this.oResourceBundle.getText("PageId");
			var pageID1 = this.oResourceBundle.getText("PageIdWi");
			var pageID2 = this.oResourceBundle.getText("PageIdHu");
			var pageID3 = this.oResourceBundle.getText("PageIdBr");
            var sPageID = pageID;

            if (this.sWN !== null && this.sWN !== undefined && this.sWN !== "") {
                if (this.sWN === "L001") {
                    var sPageID = pageID1;
                } else if (this.sWN === "L007") {
                    var sPageID = pageID2;
                } else if (this.sWN === "L009") {
                    var sPageID = pageID3;
                } else {
                    sPageID = pageID;
                }
            }

            return sPageID;
        },

		_getServiceUrl: function () {
            var sService = "";

			// ---- Get the OData Services from the manifest.json file. mediaService
			var sManifestFile  = jQuery.sap.getModulePath(_sAppModulePath + "manifest", ".json");

            if (sManifestFile !== null && sManifestFile !== undefined) {
                var oManifestData  = jQuery.sap.syncGetJSON(sManifestFile).data;

                if (oManifestData !== null && oManifestData !== undefined) {
                    var mainService = oManifestData["sap.app"].dataSources.mainService;

                    if (mainService !== null && mainService !== undefined) {
                        sService = mainService.uri;
                    }
                }
            }

            return [this.oModel, sService];
		},


		// --------------------------------------------------------------------------------------------------------------------
		// ---- Hotkey Function
		// --------------------------------------------------------------------------------------------------------------------
		
		_setKeyboardShortcuts: function() {
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                // var controlF2 = that.byId("idInput_HU");

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 13: // ---- Enter Key
                            // evt.preventDefault();
                            // var controlF1 = that.BookButton;

                            // if (that.iScanModusAktiv < 2) {
                            //     that.onPressOk();
                            // } else {
                            //     that.iScanModusAktiv = 0;
                            // }

                            // evt.keyCode = null;
                                                
                            break;			                
                        case 113: // ---- F2 Key
                            // evt.preventDefault();
        
                            // if (that.iScanModusAktiv < 2) {
                            //     if (controlF2 && controlF2.getEnabled()) {
                            //         controlF2.fireChange();
                            //     }
                            // }

                            // evt.keyCode = null;

                            break;			                
                        case 114: // ---- F3 Key
                            // evt.preventDefault();
                            // that.onNavBack();
                            break;			                
                        case 115: // ---- F4 Key
                            // evt.preventDefault();
                            // that.onPressRefresh();						
                            break;			                
                        default: 
                            // ---- For other SHORTCUT cases: refer link - https://css-tricks.com/snippets/javascript/javascript-keycodes/   
                            break;
                    }
                }
			}, this));
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Base Functions
        // --------------------------------------------------------------------------------------------------------------------

		getRouter: function () {
            if (this.getOwnerComponent() !== null && this.getOwnerComponent() !== undefined) {
                if (this.getOwnerComponent().getRouter() !== null && this.getOwnerComponent().getRouter() !== undefined) {
                    return this.getOwnerComponent().getRouter();
                }
            }
		},

		getModel: function (sName) {
            if (this.getView() !== null && this.getView() !== undefined) {
                if (this.getView().getModel(sName) !== null && this.getView().getModel(sName) !== undefined) {
                    return this.getView().getModel(sName);
                }
            }
		},

		setModel: function (oModel, sName) {
            if (this.getView() !== null && this.getView() !== undefined) {
                if (this.getView().setModel(oModel, sName) !== null && this.getView().setModel(oModel, sName) !== undefined) {
                    return this.getView().setModel(oModel, sName);
                }
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Helper Functions
        // --------------------------------------------------------------------------------------------------------------------

        _handleFocus: function () {
            // ---- Set Focus to main Input field
            var id = "idInput_HU";

            if (this.sViewMode === "Handling") { 
                id = "idInput_HU";
            } else if (this.sViewMode === "Quantity") {
                id = "idInput_Quantity";                       
            } else if (this.sViewMode === "Location") {
                id = "idInput_Location";
            } else if (this.sViewMode === "LocConf") {
                id = "idInput_LocConf";
            }

            this._setFocus(id);
        },

        _setFocus: function (id) {
            var that = this;

            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
            } else if (this.byId(id) !== null && this.byId(id) !== undefined) {
                setTimeout(() => that.getView().byId(id).focus({ preventScroll: true, focusVisible: true }));
            }
        },

		_handleDMC: function (sViewMode, sManNumber) {
            var sDMC = "";

            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                // ---- Check for Data Matix Code
                var check = tools.checkForDataMatrixArray(sManNumber);

                // ---- Check for DMC All parameter
                if (check[0] === true) {
                    if (sViewMode === "Material") {
                        sDMC = check[1];
                    } else if (sViewMode === "Quantity") {
                        sDMC = check[3];                 
                    } else if (sViewMode === "Handling") {
                        sDMC = check[5];                 
                    } else {
                        sDMC = sManNumber;
                    }
                } else {
                    sDMC = sManNumber;
                }
            }

            return sDMC;
		},

        _removePrefix: function (key) {
            let str = key;

            // ---- Check for P=Material Suffix | Q=Quantity Suffix || S=HandlingUnit Suffix
            if ((this.sViewMode === "Material" && key.startsWith("P")) || 
                (this.sViewMode === "Quantity" && key.startsWith("Q")) || 
                (this.sViewMode === "Handling" && key.startsWith("S"))) {

                this.oScanModel.setProperty("/valueSuffix", key.slice(0, 1));
                this.sSuffix = this.oScanModel.getProperty("/valueSuffix");

                // ---- Remove the Prefix from the Scanned Values
                str = key.slice(1);
            }

            return str;
        },

        _resetQuantity: function () {
            // ---- Reset the Quantity view
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewMode", "Location");
            this.oScanModel.setProperty("/viewLoc", false);
            this.oScanModel.setProperty("/feedback", true);
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueManuallyNo", "");

            this.byId("idInput_Quantity").setValueState("None");
            this.byId("idInput_Quantity").setValueStateText("");
        },

        _resetAll: function () {
            // ---- Reset the Main Model
            this.oDisplayModel.setData({});
            this.oProposalModel.setData({});

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "feedback":        false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showBooking":     false,
                "showFeedback":    true,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);
            this.iScanModusAktiv = 0;
            this.sScanType  = "";
            this.iBookCount = 0;

            this.byId("idInput_Quantity").setValueState("None");
            this.byId("idInput_Quantity").setValueStateText("");

            // ---- Set Focus to main Input field
            this._setFocus("idInput_HU");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});