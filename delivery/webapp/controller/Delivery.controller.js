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
    "z/delivery/controls/ExtScanner",
    "z/delivery/model/formatter",
    "z/delivery/utils/tools",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.delivery.";
    var _fragmentPath   = "z.delivery.view.fragments.";
	var _sAppModulePath = "z/delivery/";

    var APP = "DELIV";
 
 
    return Controller.extend("z.delivery.controller.Delivery", {

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
            // ---- Define variables for the Mobile App
            this.oView = this.getView();

            this.sWN  = "";
            this.sTPP = "";
            this.sGateNom        = "";
            this.sViewMode       = "Material";
            this.sShellSource    = "#Shell-home";
            this.iShipmentNum    = "";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the Input Fields
            this.InputGate = this.byId("idInput_Gate");
            this.InputHU   = this.byId("idInput_HU");

            // ---- Define the UI Tables
            this.HuListTable = this.byId("idTableHU");
        },

        _initLocalModels: function () {
            var sTitle = this.oResourceBundle.getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":          "Gate",
                "viewTitle":         sTitle,
                "saving":            false,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewGate":          true,
                "viewHU":            false,
                "HURequirement":     "",
                "valueManuallyNo":   ""
            };

			this.oScanModel    = new JSONModel(oData);
			this.oDisplayModel = new JSONModel([]);

            this.getView().setModel(this.oScanModel, "ScanModel");
            this.getView().setModel(this.oDisplayModel, "DisplayModel");
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
            this.InputGate.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputHU.onsapenter   = ((oEvent) => { this._onOkClicked(); });
        },

        onExit: function () {
			if (this.byId("idButtonBook_" + APP)) { this.byId("idButtonBook_" + APP).destroy(); }

            if (this.byId("idTableHU")) { this.byId("idTableHU").destroy(); }

            if (this.byId("idInput_Gate")) { this.byId("idInput_Gate").destroy();         }
            if (this.byId("idInput_HU"))   { this.byId("idInput_HU").destroy(); }
        },

        _onObjectMatched: function (oEvent) {
            this.sViewMode = this.oScanModel.getProperty("/viewMode");

			// ---- Enable the Function key solution
			// this._setKeyboardShortcuts();

            this._getShellSource();
            this._resetAll();
            this.loadUserData();
            this.loadTransportationPlanningPiontData();

            // ---- Set Focus to main Input field
            this._handleFocus();
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressSave: function () {
            this._createDelivery();
        },
        
        onPressBooking: function () {
            this._updateShipment();
        },

        onPressOk: function (sViewMode) {
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
                    var sManNumber = oScanData.valueManuallyNo;
                    
                    this.sViewMode = oScanData.viewMode;
 
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for DMC All parameter
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.trim();
                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Gate") {
                        if (sManNumber !== "") {
                            this._loadGateData(sManNumber);
                        }
                    } else if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._loadHuData(sManNumber);
                        }
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _createShipment: function (sWN, sGateNo, sTPP) {
            var sErrMesg = this.oResourceBundle.getText("ErrorCreateShipment");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var sPath   = "/Shipment";
                var urlData = {
                    "WarehouseNumber":             sWN,
                    "GateNo":                      sGateNo,
                    "TransportationPlanningPoint": sTPP
                };

                // ---- Create new Shipment
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId("idInput_Gate");

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.SapMessageText, "");
                                    }
    
                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    BusyIndicator.hide();

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }

                                that.oDisplayModel.setProperty("/ShipmentNumber", rData.ShipmentNumber);

                                that._setFocus("idInput_Gate");

                                BusyIndicator.hide();
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

        _updateShipment: function () {
            var sErrMesg = this.oResourceBundle.getText("ErrorShipment", this.iShipmentNum);
            var sOkMesg  = this.oResourceBundle.getText("OkMesShipment", this.iShipmentNum);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();

                var urlData = {
                    "BookComplete": true
                };

                var sPath = "/Shipment(WarehouseNumber='" + this.sWN + "',TransportationPlanningPoint='" + this.sTPP + "',GateNo='" + oData.GateNo + "',ShipmentNumber='" + oData.ShipmentNumber + "')";

                // ---- Update an existing Warehouse Task
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, urlData, {
                        error: function(oError, resp) {                            
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId("idInput_Gate");

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.SapMessageText, "");
                                    }
    
                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    BusyIndicator.hide();

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                                if (rData !== null && rData !== undefined) {
                                    if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "S") {
                                        // ---- Coding in case of showing Business application Informations
                                        sOkMesg = rData.SapMessageText;
                                    }
                                }

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    BusyIndicator.hide();

                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Gate");
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

        _createDelivery: function () {
            var sErrMesg = this.oResourceBundle.getText("ErrorSaveDelivery", this.iShipmentNum);
            var sOkMesg  = this.oResourceBundle.getText("OkMesSaveDelivery", this.iShipmentNum);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/Delivery";
                var urlData = {
                    "WarehouseNumber":             this.sWN,
                    "GateNo":                      this.sGateNom,
                    "TransportationPlanningPoint": this.sTPP,
                    "ShipmentNumber":              oData.ShipmentNumber
                };

                // ---- Create new Delivery
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId("idInput_HU");

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.SapMessageText, "");
                                    }
    
                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    BusyIndicator.hide();

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 204 || parseInt(oResponse.statusCode, 10) === 201) {
                                if (rData !== null && rData !== undefined) {
                                    if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "S") {
                                        // ---- Coding in case of showing Business application Informations
                                        sOkMesg = rData.SapMessageText;
                                    }
                                }

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       
                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._loadShipmentHuData(that.iShipmentNum);;
                    
                                    BusyIndicator.hide();

                                    that.oScanModel.setProperty("/showOk", false);
                                    that.oScanModel.setProperty("/showOkText", "");       

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
        // ---- Loading Functions 
        // --------------------------------------------------------------------------------------------------------------------

	    loadUserData: function () {
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
                        if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                            // ---- Coding in case of showing Business application Errors
                            tools.showMessageError(rData.SapMessageText, "");
                        } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }

                        if (rData !== null && rData !== undefined && rData !== "") {
                            that.sWN = rData.ParameterValue;
                        }
                    }
                });
        },

	    loadTransportationPlanningPiontData: function () {
            var sParam = encodeURIComponent("TDP");
            var that   = this;

            this.sTPP = "";

            BusyIndicator.show(1);

            // ---- Read the User Data from the backend
            var sPath = "/UserParameter('" + sParam + "')";

			this.oModel.read(sPath, {
				error: function(oError, resp) {
                    BusyIndicator.hide();

                    tools.handleODataRequestFailed(oError, resp, true);
				},
				success: function(rData, response) {
                    // ---- Check for complete final booking
                    if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                        // ---- Coding in case of showing Business application Errors
                        tools.showMessageError(rData.SapMessageText, "");

                        BusyIndicator.hide();

                        return;
                    } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                        // ---- Coding in case of showing Business application Informations
                        tools.alertMe(rData.SapMessageText, "");
                    }

					if (rData !== null && rData !== undefined && rData !== "") {
                        that.sTPP = rData.ParameterValue;
                    }

                    BusyIndicator.hide();
				}
			});
        },

	    _loadGateData: function (sManNumber) {
            this.sGate = sManNumber;

            var sTransportPlanPointErr = this.oResourceBundle.getText("TransportPlanPointErr");
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sErrMsg = this.oResourceBundle.getText("GateNumberErr", this.sGate);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Check for Transportation Planning Piont flag
            if (this.sTPP === "") {
                tools.showMessageError(sTransportPlanPointErr, "");
                
                return;
            }

            BusyIndicator.show(1);

            // ---- Read the Gate Data from the backend
            var sPath = "/Gate(WarehouseNumber='" + this.sWN + "',TransportationPlanningPoint='" + this.sTPP + "',GateNo='" + this.sGate + "')";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    success: function(rData, response) {
                        // ---- Start with showing data
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Gate");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                BusyIndicator.hide();

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            that._setGateData(rData, sManNumber);

                            BusyIndicator.hide();
                        } else {
                            BusyIndicator.hide();

                            // ---- Coding in case of showing Business application Errors
                            var component = that.byId("idInput_Gate");

                            if (component !== null && component !== undefined) {
                                tools.showMessageErrorFocus(sErrMsg, "", component);
                            } else {
                                tools.showMessageError(sErrMsg, "");
                            }

                            that.oScanModel.setProperty("/valueManuallyNo", "");
                        }
                    }
                });
        },

        _setGateData: function (oData, sManNumber) {
            var id = "idInput_HU";

            this.sGateNom = sManNumber;

            // ---- Set the Display data to the View            
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);
            this.oDisplayModel.setProperty("/GateDescription", oData.GateDescription);
            this.oDisplayModel.setProperty("/GateNo", oData.GateNo);

            if (oData.ShipmentNumber !== "") {
                this.iShipmentNum = oData.ShipmentNumber;

                // ---- Load the Table of Handling Units of the actual Shipment number.
                this._loadShipmentHuData(oData.ShipmentNumber);
            } else {
                this._createShipment(this.sWN, this.sGateNom, this.sTPP);
            }

            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Gate") {
                    this.oScanModel.setProperty("/viewGate", false);
                    this.oScanModel.setProperty("/viewMode", "Handling");
                    this.oScanModel.setProperty("/viewHU", true);
                    this.oScanModel.setProperty("/saving", true);
                    this.oScanModel.setProperty("/booking", false);
                    this.oScanModel.setProperty("/refresh", true);
            
                    id = "idInput_HU";
                }
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");

            // ---- Set Focus to main Input field
            this._setFocus(id);
        },

	    _loadShipmentHuData: function (iShipmentNumber) {
            var that = this;

            BusyIndicator.show(1);

            // ---- Read the HU Data from the backend
            var sPath = "/Shipment(WarehouseNumber='" + this.sWN + "',TransportationPlanningPoint='" + this.sTPP + "',GateNo='" + this.sGate + "',ShipmentNumber='" + iShipmentNumber + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, iShipmentNumber, true);
                    },
                    urlParameters: {
                        "$expand": "to_HandlingUnits"
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                var component = that.byId("idInput_HU");
                               
                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            if (rData.to_HandlingUnits.results) {
                                // ---- Set Table Data
                                that._setTableData(rData.to_HandlingUnits);

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var sErrMsg   = that.getResourceBundle().getText("HandlingUnitErr", iShipmentNumber);
                                var component = that.byId("idInput_HU");

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

        _setTableData: function (oData) {
            var oTable = this.HuListTable;

            // ---- Set Model data to Table
            this._setTableModel(oData, oTable);

            // ---- Change Table settings
            this._changeTableSettings(oTable, oData.results.length);

            // ---- Check the status of the Handling Units
            this._handleHuData(oTable);

            // ---- Set focus to Input field
            this._setFocus("idInput_HU");
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
            var sPath = "/HandlingUnit(WarehouseNumber='" + this.sWN + "',TransportationPlanningPoint='" + this.sTPP + "',GateNo='" + this.sGate + "',ShipmentNumber='" + this.iShipmentNum + "',HandlingUnitId='" + this.sActiveHU + "')";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                var component = that.byId("idInput_HU");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                BusyIndicator.hide();
                               
                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

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
            this.oScanModel.setProperty("/valueManuallyNo", "");
            
            // ---- Add data to the Display Model
            var data = this.oDisplayModel.getData();
                data.WarehouseNumber   = this.sWN;
                data.HandlingUnitId    = oData.HandlingUnitId;
                data.PackagingQuantity = oData.PackagingQuantity;

            this.oDisplayModel.setData(data);

            // ---- Load the Table of Handling Units of the actual Shipment number.
            this._loadShipmentHuData(this.iShipmentNum);
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
        // ---- Table Functions
        // --------------------------------------------------------------------------------------------------------------------

        _setTableModel: function (oData, oTable) {
            if (oData.results.length > 0) {
                for (let i = 0; i < oData.results.length; i++) {
                    var item = oData.results[i];
                        item.No = (i + 1);
                } 
            }
            
            var oModel = new JSONModel();
            oModel.setData(oData.results);

            oTable.setModel(oModel);
            oTable.bindRows("/");
        },

        _changeTableSettings: function (oTable, iLength) {
            var iMaxRowCount = parseInt(this.oResourceBundle.getText("MaxRowCount"), 10);
            var iRowCount = parseInt((iLength + 1), 10);

            if (iRowCount > iMaxRowCount) {
                iRowCount = iMaxRowCount;
            }

            oTable.setVisibleRowCount(iRowCount);
        },

        _handleHuData: function (oTable) {
            var oData = oTable.getModel().getData();
            var iDelv = 0;
            var iNote = 0;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (data.StatusLoad === true) {
                        iNote = iNote + 1;

                        data.Status = "Success";
                    } else {
                        data.Status = "None";
                    }

                    if (data.DeliveryNumber !== "") {
                        iDelv = iDelv + 1;
                    }                
                }
            }

            if (iDelv === oData.length) {
                this.oScanModel.setProperty("/booking", true);
            } else {
                this.oScanModel.setProperty("/booking", false);
            }

            this._setFocus("idInput_HU");
        },

        _handleScanModelData: function (oTable) {
            if (oTable.getModel().getData().length > 0) {
                this.oScanModel.setProperty("/viewHU", false);
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/valueManuallyNo", "");
                this.oScanModel.setProperty("/ok", false);
            } else {
                this.oScanModel.setProperty("/viewHU", true);
                this.oScanModel.setProperty("/booking", false);
                this.oScanModel.setProperty("/ok", true);
            }
        },


		// --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    this.sViewMode = this.oScanModel.getProperty("/viewMode");                  

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for Data Matix Code
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.trim()
                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    }

                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        // ---- Check for Data Matix Code
                        sScanNumber = this._handleDMC(this.sViewMode, sScanNumber);

                        sScanNumber = sScanNumber.trim()
                        sScanNumber = sScanNumber.toUpperCase();
                        
                        oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                        sManNumber = sScanNumber;
                    }

                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Gate") {
                        if (sManNumber !== "") {
                            this._loadGateData(sManNumber);
                        }
                    } else if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._loadHuData(sManNumber);
                        }
                    }
                }    
            }
		},

		onScan: function (sViewMode) {
            this.sViewMode = sViewMode;
 
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
			var pageID  = this.oResourceBundle.getText("PageId");

            if (spaceID !== null && spaceID !== undefined && spaceID !== "" && pageID !== null && pageID !== undefined && pageID !== "") {
                this.sShellSource = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;
            } else {
                if (History.getInstance() !== null && History.getInstance() !== undefined) {
                    if (History.getInstance().getPreviousHash() !== null && History.getInstance().getPreviousHash() !== undefined) {
                        var sPreviousHash = History.getInstance().getPreviousHash();
    
                        if (sPreviousHash.includes("pageId=Z_EEWM_PG_MOBILE_DIALOGS&spaceId=Z_EEWM_SP_MOBILE_DIALOGS")) {
                            this.sShellSource = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;

                            return;
                        }
                    }    
                } 

                this.sShellSource = "#Shell-home";
            }
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
                // var controlF2 = that.byId("idInput_Gate");

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 13: // ---- Enter Key
                            // evt.preventDefault();

                            // if (that.iScanModusAktiv < 2) {
                            //     that.onPressOk(that.sViewMode);
                            // } else {
                            //     that.iScanModusAktiv = 0;
                            // }

                            // evt.keyCode = null;

                            break;			                
                        case 112: // ---- F1 Key
                            // evt.preventDefault();
                            // var controlF1 = this.BookButton;

                            // if (controlF1 && controlF1.getEnabled()) {
                            //     that.onPressBooking();
                            // }
                            
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
            var id = "idInput_Gate";

            if (this.sViewMode === "Gate") { 
                id = "idInput_Gate";
            } else if (this.sViewMode === "Handling") {
                id = "idInput_HU";                       
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

        _resetByLocation: function () {
            this.oScanModel.setProperty("/viewMode", "LocConf");
            this.oScanModel.setProperty("/refresh", false);
            this.oScanModel.setProperty("/viewLocConf", true);
        },

        _resetAll: function () {
            var sTitle = this.oResourceBundle.getText("title");
            var oModel = new JSONModel([]);

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = {
                "viewMode":          "Gate",
                "viewTitle":         sTitle,
                "saving":            false,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewGate":          true,
                "viewHU":            false,
                "HURequirement":     "",
                "valueManuallyNo":   ""
            };

            this.oScanModel.setData(oData);

            // ---- Reset of the booking count
            this.sGateNom     = "";
            this.iBookCount   = 0;
            this.iShipmentNum = "";

			// ---- Reset the UI Table for Queues
            if (this.HuListTable !== null && this.HuListTable !== undefined) {
                if (this.HuListTable.getBusy()) {
                    this.HuListTable.setBusy(!this.HuListTable.getBusy());
                }

                this.HuListTable.setModel(oModel);
            }

            // ---- Set Focus to main Input field
            this._setFocus("idInput_Gate");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});