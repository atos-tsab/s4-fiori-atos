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
    "z/delivery/controller/BaseController",
    "z/delivery/controls/ExtScanner",
    "z/delivery/model/formatter",
    "z/delivery/utils/tools",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath   = "z.delivery.view.fragments.";
	var _sAppModulePath = "z/delivery/";
    var APP = "DELIV";
 
 
    return BaseController.extend("z.delivery.controller.Delivery", {

 		// ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools: tools,


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Init:
        // --------------------------------------------------------------------------------------------------------------------

        onInit: function () {
            this._initLocalVars();
            this._initLocalModels();
            this._initBarCodeScanner();
            this._initLocalRouting();
        },

        _initLocalVars: function () {
            // ---- Define variables for the Mobile App
            this.oView = this.getView();

            this.sWN  = "";
            this.sTPP = "";
            this.iMat = "";
            this.sViewMode       = "Material";
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);
        },

        _initLocalModels: function () {
            var sTitle = this.getResourceBundle().getText("title");

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
            this.oMainModel = this.getOwnerComponent().getModel();

            this.oScanner = new ExtScanner({
                settings:     true,
                valueScanned: that.onScanned.bind(that),
                decoderKey:   "text",
                decoders:     that.getDecoders(),
                models: 	  that.oMainModel
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
        },

        onExit: function () {
			if (this.byId("idButtonBook_" + APP)) {
				this.byId("idButtonBook_" + APP).destroy();
			}
        },

        _onObjectMatched: function (oEvent) {
			// ---- Enable the Function key solution
			this._setKeyboardShortcuts();

            this._getShellSource();
            this._resetAll();
            this.loadUserData();
            this.loadTransportationPlanningPiontData();

            // ---- Set Focus to main Input field
            this._setFocus("idInput_Material");
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressSave: function () {
            this._createDelivery();
        },
        
        onPressBooking: function () {
            var data = this.oDisplayModel.getData();

            if (data.ShipmentNumber === "") {
                this._createShipment();
            } else {
                this._updateShipment();
            }
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
                        this._loadGateData(sManNumber);
                    } else if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _createShipment: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iMat);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iMat);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/Shipment";
                var urlData = {
                    "WarehouseNumber":       oData.WarehouseNumber,
                    "ShipmentNumber":        oData.ShipmentNumber,
                    "HandlingUnit":          oData.HandlingUnit,
                    "PackagingQuantity":     oData.PackagingQuantity,
                    "GateNo":                oData.GateNo
                };

                // ---- Create new Shipment
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            tools.handleODataRequestFailed(oError, resp, true);

                            // that._resetByLocation();
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    // that._resetAll();
                                    that._setFocus("idInput_Gate");

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                                parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Gate");
                                }, tSTime);            
                            } else {
                                tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                            }
                        }
                    });
            } else {
                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _updateShipment: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();

                var urlData = {
                    "ShipmentNumber":    oData.ShipmentNumber,
                    "PackagingQuantity": oData.PackagingQuantity,
                    "GateNo":            oData.GateNo
                };

                var sWarehouseNumber = oData.WarehouseNumber;
                var sHandlingUnit    = oData.HandlingUnit;

                var sPath = "/Shipment(WarehouseNumber='" + sWarehouseNumber + "',HandlingUnit='" + sHandlingUnit + "')";

                // ---- Update an existing Warehouse Task
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, urlData, {
                        error: function(oError, resp) {
                            tools.handleODataRequestFailed(oError, resp, true);
                            
                            that._resetQuantity();
                            that.oScanModel.setProperty("/refresh", true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    // that._resetAll();
                                    that._setFocus("idInput_Gate");

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Gate");
                                }, tSTime);            
                            } else {
                                tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                            }
                        }
                    });
            } else {
                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _createDelivery: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iMat);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iMat);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/Delivery";
                var urlData = {
                    "WarehouseNumber":       oData.WarehouseNumber,
                    "HandlingUnit":          oData.HandlingUnit,
                    "PackagingQuantity":     oData.PackagingQuantity,
                    "GateNo":                oData.GateNo
                };

                // ---- Create new Shipment
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            tools.handleODataRequestFailed(oError, resp, true);

                            // that._resetByLocation();
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    // that._resetAll();
                                    that._setFocus("idInput_Material");

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                                parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Material");
                                }, tSTime);            
                            } else {
                                tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                            }
                        }
                    });
            } else {
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

			this.oModel.read(sPath, {
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

            // ---- Read the User Data from the backend
            var sPath = "/UserParameter('" + sParam + "')";

			this.oModel.read(sPath, {
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
                        that.sTPP = rData.ParameterValue;
                    }
				}
			});
        },

	    _loadGateData: function (sManNumber) {
            this.sGate = sManNumber;

            var sTransportPlanPointErr = this.getResourceBundle().getText("TransportPlanPointErr");
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sErrMsg = this.getResourceBundle().getText("GateNumberErr", this.sGate);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.iWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Check for Transportation Planning Piont flag
            if (this.sTPP === "") {
                tools.showMessageError(sTransportPlanPointErr, "");
                
                return;
            }

            // ---- Read the Gate Data from the backend
            var sPath = "/Gate(GateNo='" + this.sGate + "',TransportationPlanningPoint='" + this.sTPP + "')";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        // ---- Start with showing data
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");
                                
                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            that._setGateData(rData, sManNumber);
                        } else {
                            tools.alertMe(sErrMsg, "");
                        }
                    }
                });
        },

        _setGateData: function (oData, sManNumber) {
            var id = "idInput_HandlingUnit";

            // ---- Set the Display data to the View            
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);
            this.oDisplayModel.setProperty("/GateDescription", oData.GateDescription);
            this.oDisplayModel.setProperty("/GateNo", oData.GateNo);

            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Gate") {
                    this.oScanModel.setProperty("/viewGate", false);
                    this.oScanModel.setProperty("/viewMode", "Handling");
                    this.oScanModel.setProperty("/viewHU", true);
    
                    id = "idInput_HandlingUnit";
                }
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");

            // ---- Set Focus to main Input field
            this._setFocus(id);
        },

	    _loadHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var that = this;

            this.sActiveHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
            var sPath = "/Shipment(WarehouseNumber='" + this.sWN + "',HandlingUnit='" + this.sActiveHU + "',GateNo='" + this.sGate + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                tools.alertMe(rData.SapMessageText, "");
                                
                                that._resetAll();
                                that._setFocus("idInput_Gate");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            if (rData !== "") {
                                that._setHuData(rData, sManNumber);
                            } else {
                                var sErrMsg = that.getResourceBundle().getText("HandlingUnitErr", sManNumber);

                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

	    _setHuData: function (oData, sManNumber) {
            this.oScanModel.setProperty("/saving", true);
            this.oScanModel.setProperty("/booking", true);
            
            // ---- Add data to the Display Model
            var data = this.oDisplayModel.getData();
                data.WarehouseNumber   = this.sWN;
                data.HandlingUnit      = oData.HandlingUnit;
                data.PackagingQuantity = oData.PackagingQuantity;
                data.ShipmentNumber    = oData.ShipmentNumber;

            this.oDisplayModel.setData(data);
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
                        key = this._removePrefix(key);

                        this.oScanModel.setProperty("/valueManuallyNo", key);
                    } else {
                        this.oScanModel.setProperty("/valueManuallyNo", "");
                    }
                }
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
                        this._loadGateData(sManNumber);
                    } else if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
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
			var spaceID = this.getResourceBundle().getText("SpaceId");
			var pageID  = this.getResourceBundle().getText("PageId");

            if (History.getInstance() !== null && History.getInstance() !== undefined) {
                if (History.getInstance().getPreviousHash() !== null && History.getInstance().getPreviousHash() !== undefined) {
                    var sSpaceHome  = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;
                    var sShellHome  = "#Shell-home";

                    var sPreviousHash = History.getInstance().getPreviousHash();

                    if (sPreviousHash.includes("pageId=Z_EEWM_PG_MOBILE_DIALOGS&spaceId=Z_EEWM_SP_MOBILE_DIALOGS")) {
                        this.sShellSource = sSpaceHome;
                    } else {
                        this.sShellSource = sShellHome;
                    }
                }    
            }
		},

		_getServiceUrl: function () {
            var sService = "";

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

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
                            evt.preventDefault();

                            if (that.iScanModusAktiv < 2) {
                                that.onPressOk(that.sViewMode);
                            } else {
                                that.iScanModusAktiv = 0;
                            }

                            evt.keyCode = null;

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
        // ---- Helper Functions
        // --------------------------------------------------------------------------------------------------------------------

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
            var sTitle = this.getResourceBundle().getText("title");

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
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});