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
    "z/recweforeign/controller/BaseController",
	"z/recweforeign/controls/ExtScanner",
	"z/recweforeign/model/formatter",
	"z/recweforeign/utils/tools",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath   = "z.recweforeign.view.fragments.";
	var _sAppModulePath = "z/recweforeign/";
    var APP = "REC_WE_FORN";
 
 
    return BaseController.extend("z.recweforeign.controller.RecWeForeign", {

 		// ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools:  tools,


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
            // ---- Define variables for the License View
            this.oView = this.getView();

            this.iWN = "";
            this.iHU = "";
            this.sScanType       = "";
            this.sShellSource    = "#Shell-home";
            this.oDeliveryData   = {};
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.MaterialInfoTable = this.byId("idTableMaterialInfo");
            this.PackageListTable  = this.byId("idTablePackageList");
        },

        _initLocalModels: function () {
            var sTitle = this.getResourceBundle().getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "storno":          false,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "valueManuallyNo": ""
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

            // ---- Set Focus to main Input field
            this._setFocus();
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressSave: function () {
        },

        onPressBooking: function () {
            var iDocumentNo   = this.oDisplayModel.getProperty("/DocumentNo");

            if (this.ScanModus === "A") {
                this.saveBookingData(iDocumentNo);
            } else {
                if (this.AllBooked) {
                    this.saveBookingData(iDocumentNo);
                } else {
                    this.onBookApprovalOpen(iDocumentNo);
                }
            }
        },

        onPressOk: function () {
            this._onOkClicked();
        },

        onPressCancellation: function () {
            this.onCancellationApprovalOpen();
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
                        sManNumber = oScanData.valueManuallyNo.trim();
                        sManNumber = this._removePrefix(sManNumber);
                        
                        this.iHU = sManNumber;
                    } else {
                        sManNumber = "";
                    }

                     this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _bookHuMissingData: function (oTable) {
            var smallAmountHint = this.getResourceBundle().getText("HandlingSmallAmountHint");
            var oData = oTable.getModel().getData();
            var iODataLength = oData.length;
            var iCounter     = 1;

            // ---- Update the HU Data to the backend
            if (oData.length > 0) {
                this.oModel.setDeferredGroups(["huListGroup"]);
                this.oModel.setUseBatch(true);
                this.getView().setBusy(true);

                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (data.StatusUnload === false) {
                        var sPath = "/DeliveryHU(WarehouseNumber='" + data.WarehouseNumber + "',HandlingUnit='" + data.HandlingUnit + "')";
                        var that  = this;
    
                        var urlParam = { "BookMissing": true };
    
                        this.oModel.update(sPath, urlParam, { groupId: "huListGroup", success: function(rData, oResponse) {}, error: function(oError, resp) {} });
    
                        this.oModel.submitChanges({
                            groupId: "huListGroup",
                            error: function (oError, resp) {
                                that.oModel.setUseBatch(false);
                                that.getView().setBusy(false);
                                
                                tools.handleODataRequestFailed(oError, resp, true);
                            },
                            success: function (rData, oResponse) {
                                that.oModel.setUseBatch(false);
                                that.getView().setBusy(false);
    
                                if (iCounter === iODataLength) {
                                    that.oScanModel.setProperty("/showOk", true);
                                    that.oScanModel.setProperty("/showOkText", smallAmountHint);

                                    that.iScanModusAktiv = 0;
                                    that._reloadHuData(oTable);
                                }
    
                                iCounter = iCounter + 1;
                            }
                        }); 
                    } else {
                        iODataLength = iODataLength - 1;
                    }
                }
            }
        },

        saveBookingData: function (iDocumentNo) {
            var iDocumentNo = this.oDisplayModel.getProperty("/DocumentNo");
            var iDeliveryNo = this.oDisplayModel.getProperty("/DeliveryNo");
            var sOkMesg     = this.getResourceBundle().getText("OkMesBooking", iDeliveryNo);
            var sErrMesg    = this.getResourceBundle().getText("ErrorBooking", iDocumentNo);
            var tSTime = this.getResourceBundle().getText("ShowTime");
            var that   = this;

            if (this.oDeliveryData !== null && this.oDeliveryData !== undefined && iDocumentNo === this.oDeliveryData.DocumentNo) {
                var sDeliveryNo = this.oDeliveryData.DocumentNo;
                
                delete this.oDeliveryData.HandlingUnit;

                this.oDeliveryData.BookGoodsReceipt = true;

                var sPath = "/Delivery(DocumentNo='" + sDeliveryNo + "')";
    
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, that.oDeliveryData, {
                        error: function(oError, resp) {
                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_HU");
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

        _CancelHuData: function (oTable) {
            var sOkMesg  = this.getResourceBundle().getText("OkMesCancellation");
            var sErrMesg = this.getResourceBundle().getText("ErrorCancellation");
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var oData    = oTable.getModel().getData();
            var iODataLength = oData.length;
            var iCounter = 1;

            // ---- Update the HU Data to the backend
            if (oData.length > 0) {
                this.oModel.setDeferredGroups(["huListGroup"]);
                this.oModel.setUseBatch(true);
                this.getView().setBusy(true);

                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (data.StatusUnload === true) {
                        var sPath = "/DeliveryHU(WarehouseNumber='" + data.WarehouseNumber + "',HandlingUnit='" + data.HandlingUnit + "')";
                        var that  = this;

                        var urlParam = { "BookUnloadCancel": true };

                        this.oModel.update(sPath, urlParam, { groupId: "huListGroup", success: function(rData, oResponse) {}, error: function(oError, resp) {} });

                        this.oModel.submitChanges({
                            groupId: "huListGroup",
                            error: function (oError, resp) {
                                that.oModel.setUseBatch(false);
                                that.getView().setBusy(false);
                                
                                tools.handleODataRequestFailed(oError, resp, true);
                            },
                            success: function (rData, oResponse) {
                                that.oModel.setUseBatch(false);
                                that.getView().setBusy(false);

                                if (iCounter === iODataLength) {
                                    if (parseInt(oResponse.statusCode, 10) === 202 && (oResponse.statusText === "Accepted" || oResponse.statusText === "")) {
                                        that.oScanModel.setProperty("/showOk", true);
                                        that.oScanModel.setProperty("/showOkText", sOkMesg);       
        
                                        // ---- Do nothing -> Good case
                                        setTimeout(function () {
                                            that._resetAll();
                            
                                            // ---- Set Focus to main Input field
                                            that._setFocus("idInput_HU");
                                        }, tSTime);            
                                    } else {
                                        tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                                    }
                                }

                                iCounter = iCounter + 1;
                            }
                        }); 
                    } else {
                        iODataLength = iODataLength - 1;
                    }
                }
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
            var that   = this;

            this.iWN = "";

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
                            that.iWN = rData.ParameterValue;
                        }
                    }
                });
        },

	    _loadHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sErrMsg = this.getResourceBundle().getText("HandlingUnitErr", this.iHU);
            var that = this;

            this.iHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.iWN));
                aFilters.push(new sap.ui.model.Filter("HandlingUnit", sap.ui.model.FilterOperator.EQ, this.iHU));

            var oModel = this._getServiceUrl()[0];
                oModel.read("/DeliveryHU", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus();

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];
                                    
                                    if (data.HandlingUnit === that.iHU) {                                    
                                        that._loadDeliveryData(data.DocumentNo, that.iHU, rData);
                                    }
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

	    _loadDeliveryData: function (sDocumentNo, iHU, oData) {
            var that = this;

            // ---- Read the HU Data from the backend
			var sPath = "/Delivery('" + sDocumentNo + "')?$expand=to_HUs";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E" && rData.StatusGoodsReceipt === true) {
                                tools.showMessageError(rData.SapMessageText, "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E" && rData.StatusGoodsReceipt === false) {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");
                                
                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            // ---- Start with showing data
                            that.oDeliveryData = rData;

                            // ---- Set the Data for the Model and set the Model to the View
                            rData.HandlingUnit = iHU;

                            that.oDisplayModel.setData(rData);
                            
                            // ---- Handle the Scan Modus for the different tables
                            that.ScanModus = rData.ScanModus;
                            that.iScanModusAktiv = 0;

                            if (rData.ScanModus === "A") {
                                that._setTableDataA(oData);

                                that.byId("idScrollContainerTableA").setVisible(true);
                                that.byId("idScrollContainerTableB").setVisible(false);        
                            } else {
                                that._setTableDataB(oData, iHU);

                                that.byId("idScrollContainerTableA").setVisible(false);
                                that.byId("idScrollContainerTableB").setVisible(true);        
                            }
                        }
                    }
                });
        },

	    _reloadHuData: function (oTable) {
            var that = this;

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.iWN));
                aFilters.push(new sap.ui.model.Filter("HandlingUnit", sap.ui.model.FilterOperator.EQ, this.iHU));

            var oModel = this._getServiceUrl()[0];
                oModel.read("/DeliveryHU", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                    
                                    that._setFocus();

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            that._setTableModel(rData, oTable);
                            
                            if (rData.results.length > 0) {
                                that._handleHuData(oTable);
                            }
                        }
                    }
                });
        },

        _setTableDataA: function (oData) {
            var oTable = this.MaterialInfoTable;

            // ---- Set Model data to Table
            this._setTableModel(oData, oTable);

            // ---- Change Table settings
            this._changeTableSettings(oTable, oData.results.length);

            // ---- Handle Scan Model data
            this._handleScanModelData("A", oTable);

            // ---- Set the booking Status for the whole Delivery
            this._updateStatusAllHUs(oTable, oData);

            // ---- Set focus to Input field
            this._setFocus();
        },

        _setTableDataB: function (oData, iHU) {
            var oTable = this.PackageListTable;
            
            // ---- Set Model data to Table
            this._setTableModel(oData, oTable);

            // ---- Change Table settings
            this._changeTableSettings(oTable, oData.results.length);

            // ---- Handle Scan Model data
            this._handleScanModelData("B", oTable);

            // ---- Set the booking Status for the enterd HU
            this._updateStatusSingleHU(oTable, iHU);

            // ---- Set focus to Input field
            this._setFocus();
        },

        _updateStatusAllHUs: function (oTable, oData) {
            var iODataLength = oData.results.length;
            var iCounter     = 1;
            var that = this;

            // ---- Update the HU Data to the backend
            if (oData.results.length > 0) {
                this.oModel.setDeferredGroups(["huListGroup"]);
                this.oModel.setUseBatch(true);
                this.getView().setBusy(true);

                for (let i = 0; i < oData.results.length; i++) {
                    var data = oData.results[i];
                        data.BookUnload = true;

                    var sPath = "/DeliveryHU(WarehouseNumber='" + data.WarehouseNumber + "',HandlingUnit='" + data.HandlingUnit + "')";

                    this.oModel.update(sPath, data, { groupId: "huListGroup", success: function(rData, oResponse) {}, error: function(oError, resp) {} });
                    this.oModel.submitChanges({
                        groupId: "huListGroup",
                        error: function (oError, resp) {
                            that.oModel.setUseBatch(false);
                            that.getView().setBusy(false);

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function (rData, oResponse) {
                            that.oModel.setUseBatch(false);
                            that.getView().setBusy(false);

                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    tools.alertMe(rData.SapMessageText, "");
                                    
                                    that._setFocus();

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

                            if (iCounter === iODataLength) {
                                that._reloadHuData(oTable);
                            }

                            iCounter = iCounter + 1;
                        }
                    }); 
                }
            }
        },

        _updateStatusSingleHU: function (oTable, iHU) {
            var that = this;

            var sPath    = "/DeliveryHU(WarehouseNumber='" + this.iWN + "',HandlingUnit='" + this.iHU + "')";
            var urlParam = { "BookUnload": true };

            var oModel = this._getServiceUrl()[0];
                oModel.update(sPath, urlParam, { 
                    error: function (oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                tools.alertMe(rData.SapMessageText, "");
                                
                                that._setFocus();
    
                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                            // ---- Reload the HU data
                            that._reloadHuData(oTable);
                        } else {
                            tools.showMessageError(oResponse.statusText, oResponse.statusCode);
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
                        key = this._removePrefix(key);

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
            var iMaxRowCount = parseInt(this.getResourceBundle().getText("MaxRowCount"), 10);
            var iRowCount    = parseInt((iLength + 1), 10);

            if (iRowCount > iMaxRowCount) {
                iRowCount = iMaxRowCount;
            }

            oTable.setVisibleRowCount(iRowCount);
		},

		_handleScanModelData: function (type, oTable) {
            this.oScanModel.setProperty("/storno", true);
            if (oTable.getModel().getData().length > 0) {
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/valueManuallyNo", "");

                if (type === "A") {
                    this.sScanType = "A";
                    this.oScanModel.setProperty("/ok", false);
                } else {
                    this.sScanType = "B";
                    this.oScanModel.setProperty("/ok", true);
                }
             } else {
                this.oScanModel.setProperty("/booking", false);
                this.oScanModel.setProperty("/ok", true);
            }
		},

		_handleHuData: function (oTable) {
            var oData = oTable.getModel().getData();
            var sNote = 0;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === true) {
                        sNote = sNote + 1;
                    }
                }
            }

            if (sNote === oData.length) {
                this.AllBooked = true;
            } else {
                this.AllBooked = false;
            }
    
            // var oDisplayModel = this.getView().getModel("DisplayModel");
            this.oDisplayModel.setProperty("/PSDeliveryNote", sNote + " / " + oData.length);
		},

		_handleLessHuData: function (oTable) {
            var oData = oTable.getModel().getData();

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === false) {
                        data.BookMissing = true;
                        data.Status = "Error";
                    } else if (data.StatusUnload === true) {
                        data.Status = "Success";
                    }
                }
            }

            oTable.getModel().setData(oData);
		},

		_resetLessHuData: function (oTable) {
            var oData = oTable.getModel().getData();

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === false) {
                        data.BookMissing = false;
                        data.Status = "None";
                    } else if (data.StatusUnload === true) {
                        data.Status = "Success";
                    }
                }
            }

            oTable.getModel().setData(oData);
		},


		// --------------------------------------------------------------------------------------------------------------------
		// ---- Dialog Functions
		// --------------------------------------------------------------------------------------------------------------------

		onBookApprovalOpen: function (sceneNumber, activeStatus) {
			var fragmentFile = _fragmentPath + "DialogApproveBooking";
            var oTable = this.PackageListTable;
			var oView = this.getView();
			var that = this;
			
            // ---- Mark all HU's which are not delivered (under booking)
            this._handleLessHuData(oTable);

            // ---- Starts the Bookung Dialog for Handling Units
			if (!this.getView().dialogApproveBooking) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogApproveBooking = oDialog;
					oView.dialogApproveBooking.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogApproveBooking.open();
				});
			} else {
                oView.dialogApproveBooking.open();
            }
 		},

		onBookApprovalClose: function () {
            var oTable = this.PackageListTable;

            if (this.getView().dialogApproveBooking) {
				this.getView().dialogApproveBooking.close();
			}

            // ---- Unmark all HU's which are not delivered (reset under booking)
            this._resetLessHuData(oTable);

            this._setFocus();
		},

		onBookApprovalAfterClose: function () {
            this._setFocus();
		},

		onBookApprovalSave: function () {
			if (this.getView().dialogApproveBooking) {
				this.getView().dialogApproveBooking.close();
			}

            // ---- Remove all not found Handling Units from the Delivery
            var oTable = this.PackageListTable;

            // ---- Unmark all HU's which are not delivered (reset under booking) and start booking
            this._resetLessHuData(oTable);
            this._bookHuMissingData(oTable);

            // ---- Set Focus to default Input field
            this._setFocus();
		},

        // --------------------------------------------------------------------------------------------------------------------

        onCancellationApprovalOpen: function () {
			var fragmentFile = _fragmentPath + "dialogApproveCancellation";
			var oView = this.getView();
			var that = this;
			
            // ---- Starts the Bookung Dialog for Handling Units
			if (!this.getView().dialogApproveCancellation) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogApproveCancellation = oDialog;
					oView.dialogApproveCancellation.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogApproveCancellation.open();
				});
			} else {
                oView.dialogApproveCancellation.open();
            }
 		},

		onCancellationApprovalClose: function () {
            var oTable = this.PackageListTable;

            if (this.getView().dialogApproveCancellation) {
				this.getView().dialogApproveCancellation.close();
			}

            this._setFocus();
		},

		onCancellationkApprovalAfterClose: function () {
            this._setFocus();
		},

		onCancellationApprovalSave: function () {
			if (this.getView().dialogApproveCancellation) {
				this.getView().dialogApproveCancellation.close();
			}

            // ---- Remove all not found Handling Units from the Delivery
            var oTable = this.PackageListTable;

            // ---- Unmark all HU's which are not delivered (reset under Cancellation)
            this._CancelHuData(oTable);

            // ---- Set Focus to default Input field
            this._setFocus();
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
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    this.sViewMode = oScanModel.getData().viewMode;

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oEvent.getParameter("valueManuallyNo").trim()

                        oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    }

                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                        sManNumber = sScanNumber;
                    }

                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
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
                var controlF2 = that.byId("idInput_HU");

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk();
                        } else {
                            that.iScanModusAktiv = 0;
                        }

                        evt.keyCode = null;
                        					
						break;			                
			        case 112: // ---- F1 Key
                        evt.preventDefault();
                        var controlF1 = that.BookButton;

				        if (controlF1 && controlF1.getEnabled()) {
                            that.onPressBooking();
                        }
						
						break;			                
                    case 113: // ---- F2 Key
                        evt.preventDefault();
        
                        if (that.iScanModusAktiv < 2) {
                            if (controlF2 && controlF2.getEnabled()) {
                                controlF2.fireChange();
                            }
                        }

                        evt.keyCode = null;

                        break;			                
                    case 114: // ---- F3 Key
                        evt.preventDefault();
                        that.onNavBack();
						break;			                
                    case 115: // ---- F4 Key
                        evt.preventDefault();
						that.onPressRefresh();						
						break;			                
                    case 116: // ---- F5 Key
                        evt.preventDefault();
						that.onPressCancellation();						
						break;			                
					default: 
					    // ---- For other SHORTCUT cases: refer link - https://css-tricks.com/snippets/javascript/javascript-keycodes/   
                        break;
				}
			}, this));
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Helper Functions
        // --------------------------------------------------------------------------------------------------------------------

        _setFocus: function () {
            var id = "idInput_HU";
            var that = this;

            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
            } else if (this.byId(id) !== null && this.byId(id) !== undefined) {
                setTimeout(() => that.getView().byId(id).focus({ preventScroll: true, focusVisible: true }));
            }
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

        _resetSortingState: function() {
            var oTable = this.PackageListTable;
			var aColumns = oTable.getColumns();

			for (var i = 0; i < aColumns.length; i++) {
				aColumns[i].setSorted(false);
			}
		},

        _resetAll: function () {
            var oModel = new JSONModel([]);

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "storno":          false,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);
            this.iScanModusAktiv = 0;
            this.sScanType = "";

            // ---- Reset the Scroll container
            this.byId("idScrollContainerTableA").setVisible(true);
            this.byId("idScrollContainerTableB").setVisible(false);

			// ---- Reset the UI Table A
            if (this.MaterialInfoTable !== null && this.MaterialInfoTable !== undefined) {
                if (this.MaterialInfoTable.getBusy()) {
                    this.MaterialInfoTable.setBusy(!this.MaterialInfoTable.getBusy());
                }

                this.MaterialInfoTable.setModel(oModel);
                this.MaterialInfoTable.setVisibleRowCount(1);
            }

            // ---- Reset the UI Table B
            if (this.PackageListTable !== null && this.PackageListTable !== undefined) {
                if (this.PackageListTable.getBusy()) {
                    this.PackageListTable.setBusy(!this.PackageListTable.getBusy());
                }
            }
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});