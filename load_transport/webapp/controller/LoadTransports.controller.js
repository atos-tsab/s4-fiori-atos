/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Loading for transport
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
    "z/loadtransport/controls/ExtScanner",
    "z/loadtransport/model/formatter",
    "z/loadtransport/utils/tools",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

    // ---- The app namespace is to be define here!
    var _sAppPath       = "z.loadtransport.";
    var _fragmentPath   = "z.loadtransport.view.fragments.";
    var _sAppModulePath = "z/loadtransport/";

    var APP = "LOAD_TRANSP";


    return Controller.extend("z.loadtransport.controller.RecWeForeign", {

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

            this.iWN = "";
            this.iHU = "";
            this.sScanType = "";
            this.sShellSource = "#Shell-home";
            this.oDeliveryData = {};
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.HuListTable = this.byId("idTableHU");

            // ---- Define the Input Fields
            this.InputTP = this.byId("idInput_Transport");
            this.InputHU = this.byId("idInput_HU");
        },

        _initLocalModels: function () {
            var sTitle = this.oResourceBundle.getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "Transport",
                "booking":         false,
                "refresh":         true,
                "storno":          false,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewTR":          true,
                "viewHU":          false,
                "valueManuallyNo": ""
            };

            this.oScanModel      = new JSONModel(oData);
            this.oDisplayModel   = new JSONModel([]);
            this.oDisplayModelTR = new JSONModel([]);

            this.getView().setModel(this.oScanModel, "ScanModel");
            this.getView().setModel(this.oDisplayModel, "DisplayModel");
            this.getView().setModel(this.oDisplayModelTR, "DisplayModelTR");
        },

        _initBarCodeScanner: function () {
            var that = this;

            // ---- Handle the Bar / QR Code scanning
            this.oScanner = new ExtScanner({
                settings: true,
                valueScanned: that.onScanned.bind(that),
                decoderKey: "text",
                decoders: that.getDecoders(),
                models: that.oModel
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
            this.InputTP.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputHU.onsapenter = ((oEvent) => { this._onOkClicked(); });
        },

        onExit: function () {
            if (this.byId("idButtonBook_" + APP)) { this.byId("idButtonBook_" + APP).destroy(); }

            if (this.byId("idTableHU")) { this.byId("idTableHU").destroy(); }

            if (this.byId("idInput_HU"))        { this.byId("idInput_HU").destroy();        }
            if (this.byId("idInput_Transport")) { this.byId("idInput_Transport").destroy(); }
        },

        _onObjectMatched: function (oEvent) {
            this.sViewMode = this.oScanModel.getProperty("/viewMode");

            // ---- Enable the Function key solution
            // this._setKeyboardShortcuts();

            this._getShellSource();
            this._resetAll();
            this.loadUserData();

            // ---- Set Focus to main Input field
            this._handleFocus();
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            this.saveBookingData();
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
                    var oScanData = oScanModel.getData();
                    var sManNumber = oScanData.valueManuallyNo;

                    this.sViewMode = oScanData.viewMode;

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for DMC All parameter
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.trim();
                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.iHU = sManNumber;

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Transport") {
                        if (sManNumber !== "") {
                            this._loadTransportData(sManNumber);
                        }
                    } else if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._updateStatusSingleHU(sManNumber);
                        }
                    }
                }
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        saveBookingData: function () {
            var iShipmentNumber   = this.oDisplayModelTR.getProperty("/ShipmentNumber");
            var sOkMesg = this.oResourceBundle.getText("OkMesBooking", iShipmentNumber);
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", iShipmentNumber);
            var tSTime = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (iShipmentNumber !== null && iShipmentNumber !== undefined && iShipmentNumber !== "") {
                BusyIndicator.show(1);

                var sPath = "/ScaniaGI(ShipmentNumber='" + iShipmentNumber + "')";
                var urlParam = { "BookGoodsIssue": true };

                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, urlParam, {
                        error: function (oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function (rData, oResponse) {
                            if (parseInt(oResponse.statusCode, 10) === 201 || parseInt(oResponse.statusCode, 10) === 204) {
                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();

                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Transport");
                                }, tSTime);
                            } else {
                                BusyIndicator.hide();

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
        // ---- Loading / Set Functions
        // --------------------------------------------------------------------------------------------------------------------

        loadUserData: function () {
            var sParam = encodeURIComponent("/SCWM/LGN");
            var that = this;

            this.iWN = "";

            // ---- Read the User Data from the backend
            var sPath = "/UserParameter('" + sParam + "')";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function (oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function (rData, response) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (rData !== null && rData !== undefined && rData !== "") {
                            that.iWN = rData.ParameterValue;
                        }
                    }
                });
        },

        _loadTransportData: function (sManNumber) {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sErrMsg = this.oResourceBundle.getText("TransportErr", sManNumber);
            var oTable = this.HuListTable;
            var that = this;

            this.iTR = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");

                return;
            }

            // ---- Read the Transport Data from the backend
            var sPath = "/ScaniaGI(ShipmentNumber='" + this.iTR + "')";

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function (oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    urlParameters: {
                        "$expand": "to_HandlingUnits"
                    },
                    success: function (rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                that._resetAll();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Transport");

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

                            // ---- Get the Handling Units data
                            if (rData.to_HandlingUnits.results.length > 0) {
                                BusyIndicator.hide();

                                that.oDisplayModelTR.setData(rData);
                                that._setTransportData(rData.to_HandlingUnits);
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Transport");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(sErrMsg, "", component);
                                } else {
                                    tools.showMessageError(sErrMsg, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");
                            }
                        } else {
                            BusyIndicator.hide();

                            // ---- Coding in case of showing Business application Errors
                            var component = that.byId("idInput_Transport");

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

        _setTransportData: function (oData) {
            // ---- Change the Scan Model data
            this.oScanModel.setProperty("/booking", false);
            this.oScanModel.setProperty("/ok", true);
    
            if (this.sViewMode === "Transport") {
                this.oScanModel.setProperty("/viewMode", "Handling");
                this.oScanModel.setProperty("/viewTR", false);
                this.oScanModel.setProperty("/viewHU", true);
                this.oScanModel.setProperty("/valueManuallyNo", "");

                this._setTableData(oData);
            } else {
                this.oScanModel.setProperty("/viewMode", "Transport");
                this.oScanModel.setProperty("/viewHU", false);
                this.oScanModel.setProperty("/viewTR", true);
                this.oScanModel.setProperty("/valueManuallyNo", "");
            }
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

        _updateStatusSingleHU: function (iHU) {
            var oTable = this.HuListTable;
            var that = this;

            var sPath = "/ScaniaGIHU(HandlingUnitId='" + iHU  + "')";
            var urlParam = { "BookLoad": true };

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.update(sPath, urlParam, { 
                    error: function (oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, iHU, true);
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

                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (parseInt(oResponse.statusCode, 10) === 201 || parseInt(oResponse.statusCode, 10) === 204) {
                            // ---- Reload the HU data
                            that._reloadHuData(oTable);

                            BusyIndicator.hide();
                        } else {
                            BusyIndicator.hide();

                            that.oScanModel.setProperty("/valueManuallyNo", "");
                        
                            tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                        }
                    }
                });
        },

        _reloadHuData: function (oTable) {
            var that = this;

            // ---- Read the HU Data from the backend
            var sPath = "/ScaniaGI(ShipmentNumber='" + this.iTR + "')";

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function (oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, that.iTR, true);
                    },
                    urlParameters: {
                        "$expand": "to_HandlingUnits"
                    },
                    success: function (rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                that._resetAll();

                                var component = that.byId("idInput_Transport");

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

                            // ---- Get the Handling Units data
                            if (rData.to_HandlingUnits.results.length > 0) {
                                BusyIndicator.hide();

                                that._setTableData(rData.to_HandlingUnits);
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Transport");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(sErrMsg, "", component);
                                } else {
                                    tools.showMessageError(sErrMsg, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");
                            }
                        } else {
                            BusyIndicator.hide();

                            // ---- Coding in case of showing Business application Errors
                            var component = that.byId("idInput_Transport");

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
            var sNote = 0;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (data.StatusLoad === true) {
                        sNote = sNote + 1;

                        data.Status = "Success";
                    } else {
                        data.Status = "None";
                    }
                }
            }

            if (sNote === oData.length) {
                this.AllBooked = true;
            } else {
                this.AllBooked = false;
            }

            // this.oDisplayModel.setProperty("/PSDeliveryNote", sNote + " / " + oData.length);

            if (this.AllBooked) {
                this._handleScanModelData(oTable);
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
            var oScanModel = this.oScanModel;
            oScanModel.setProperty("/valueManuallyNo", "");
            oScanModel.setProperty("/valueScan", "");

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");

                    this.sViewMode = oScanModel.getData().viewMode;

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

                    if (this.sViewMode === "Transport") {
                        if (sManNumber !== "") {
                            this._loadTransportData(sManNumber);
                        }
                    } else if (this.sViewMode === "Handling") {
                        if (sManNumber !== "") {
                            this._updateStatusSingleHU(sManNumber);
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
                    key: "PDF417-UII",
                    text: "PDF417-UII",
                    decoder: that.parserPDF417UII,
                },
                {
                    key: "text",
                    text: "TEXT",
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
                var aChars = [];
                sText = "";

                for (var i = 0; i !== iLength; i++) {
                    aChars.push(oResult.text.charCodeAt(i));
                }

                var iStart = -1;
                var iGRCounter = 0;
                var iGroupUII = -1;
                var sTemp = "";

                aChars.forEach(function (code, k) {
                    switch (code) {
                        case 30:
                            if (iStart === -1) {
                                iStart = k;
                                sTemp = "";
                            } else {
                                sText = sTemp;
                                iGRCounter = -1;
                            }
                            break;
                        case 29:
                            iGRCounter += 1;
                            break;
                        default:
                            if (iGRCounter > 2 && code === 83 && iGRCounter > iGroupUII) {
                                sTemp = "";
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
            var sManifestFile = jQuery.sap.getModulePath(_sAppModulePath + "manifest", ".json");

            if (sManifestFile !== null && sManifestFile !== undefined) {
                var oManifestData = jQuery.sap.syncGetJSON(sManifestFile).data;

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

        _setKeyboardShortcuts: function () {
            var that = this;

            // ---- Set the Shortcut to buttons
            $(document).keydown($.proxy(function (evt) {
                // var controlF2 = that.byId("idInput_HU");

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 13: // ---- Enter Key
                            // evt.preventDefault();

                            // if (that.iScanModusAktiv < 2) {
                            //     that.onPressOk();
                            // } else {
                            //     that.iScanModusAktiv = 0;
                            // }

                            // evt.keyCode = null;

                            break;
                        case 112: // ---- F1 Key
                            // evt.preventDefault();
                            // var controlF1 = that.BookButton;

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
                        case 116: // ---- F5 Key
                            // evt.preventDefault();
                            // that.onPressCancellation();						
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
            var id = "idInput_Transport";

            if (this.sViewMode === "Transport") { 
                id = "idInput_Transport";
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

        _resetSortingState: function () {
            var oTable = this.HuListTable;
            var aColumns = oTable.getColumns();

            for (var i = 0; i < aColumns.length; i++) {
                aColumns[i].setSorted(false);
            }
        },

        _resetAll: function () {
            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);
            this.oDisplayModelTR.setData([]);

            // ---- Reset the Scan Model
            var oData = {
                "viewMode":        "Transport",
                "booking":         false,
                "refresh":         true,
                "storno":          false,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewTR":          true,
                "viewHU":          false,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);
            this.iScanModusAktiv = 0;
            this.sScanType = "";

            // ---- Reset the UI Table B
            if (this.HuListTable !== null && this.HuListTable !== undefined) {
                if (this.HuListTable.getBusy()) {
                    this.HuListTable.setBusy(!this.HuListTable.getBusy());
                }

                var oModel = new JSONModel([]);

                this.HuListTable.setModel(oModel);
                this.HuListTable.setVisibleRowCount(1);
            }

            // ---- Set Focus to main Input field
            this._setFocus("idInput_Transport");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});