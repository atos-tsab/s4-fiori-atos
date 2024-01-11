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
	"z/qbasedwareproc/controls/ExtScanner",
	"z/qbasedwareproc/model/formatter",
	"z/qbasedwareproc/utils/tools",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
	"sap/ui/core/library",
	"sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, BusyIndicator, CoreLibrary, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.qbasedwareproc.";
    var _fragmentPath   = "z.qbasedwareproc.view.fragments.";
	var _sAppModulePath = "z/qbasedwareproc/";

    var APP = "QBAS_PROC_WARE";
	var ValueState = CoreLibrary.ValueState;
 
 
    return Controller.extend("z.qbasedwareproc.controller.Resign", {

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

            this.sWN  = "";
            this.iHU  = "";
            this.bMDE = false;
            this.sScanType       = "";
            this.iBookCount      = 0;
            this.iHuQuantity     = 0;
            this.sActiveQMode    = "";
            this.oDeliveryData   = {};
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Input Fields
            this.idInputHU       = "";
            this.idInputQuantity = "";
            this.idInputLocConf  = "";

            this.InputHU       = this.byId("idInput_HU");
            this.InputQuantity = this.byId("idInput_Quantity");
            this.InputLocConf  = this.byId("idInput_LocConf");
        },

        _initLocalModels: function () {
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "captionResign":   sViewTitleInt,
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewStorage":     false,
                "viewHu":          true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueSuffix":     "",
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
            this.getRouter().getRoute("resign").attachPatternMatched(this._onObjectMatched, this);
        },

        // --------------------------------------------------------------------------------------------------------------------

        onBeforeRendering: function () {
        },

        onAfterRendering: function () {
            this._handleInputFields();
        },

        onExit: function () {
            if (this.byId("idInput_HU"))       { this.byId("idInput_HU").destroy();       }
            if (this.byId("idInput_Quantity")) { this.byId("idInput_Quantity").destroy(); }
            if (this.byId("idInput_LocConf"))  { this.byId("idInput_LocConf").destroy();  }

            if (this.byId("idInputMDE_HU"))       { this.byId("idInputMDE_HU").destroy();       }
            if (this.byId("idInputMDE_Quantity")) { this.byId("idInputMDE_Quantity").destroy(); }
            if (this.byId("idInputMDE_LocConf"))  { this.byId("idInputMDE_LocConf").destroy();  }
        },

        _onObjectMatched: function (oEvent) {
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");
            var sViewTitleExt = this.oResourceBundle.getText("CaptureExternal");
            this.sViewMode    = this.oScanModel.getProperty("/viewMode");

			// ---- Enable the Function key solution
			// this._setKeyboardShortcuts();

            // ---- Reset all components
            this._resetAll();

            this.UrlParam = oEvent;
            this.sSuffix  = "";

            // ---- Check for MDE device
            this._handleMDE();

			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                this.sActiveQueue = oEvent.getParameter("arguments").queue;
                this.sWN          = oEvent.getParameter("arguments").whn;
                this.sActiveQMode = oEvent.getParameter("arguments").qmode;
                this.iHU          = oEvent.getParameter("arguments").hu;
                
                if (this.sActiveQMode === "W") {
                    this.iWT = this.iHU;

                    this.oScanModel.setProperty("/captionResign", sViewTitleExt);

                    this._loadWareHouseData(this.sWN, this.sActiveQueue, this.iWT);
                } else {
                    this.oScanModel.setProperty("/captionResign", sViewTitleInt);

                    this._loadWareHouseData(this.sWN, this.sActiveQueue, this.iHU);
                }
            }
        },

        _handleInputFields: function () {
            // ---- Check for MDE device
            this.bMDE = tools.getScreenResolution(this.getModel("device"), "phone");

            if (this.bMDE) {
                this.idInputHU       = "idInputMDE_HU";
                this.idInputQuantity = "idInputMDE_Quantity";
                this.idInputLocConf  = "idInputMDE_LocConf";
    
                this.InputHU       = this.byId("idInputMDE_HU");
                this.InputQuantity = this.byId("idInputMDE_Quantity");
                this.InputLocConf  = this.byId("idInputMDE_LocConf");
            } else {
                this.idInputHU       = "idInput_HU";
                this.idInputQuantity = "idInput_Quantity";
                this.idInputLocConf  = "idInput_LocConf";
            }

            this.InputHU.onsapenter       = ((oEvent) => { this._onOkClicked(); });
            this.InputQuantity.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputLocConf.onsapenter  = ((oEvent) => { this._onOkClicked(); });
        },

        _handleMDE: function () {
            // ---- Check for MDE device
            this.bMDE = tools.getScreenResolution(this.getModel("device"), "phone");

            if (this.bMDE) {
                this.oScanModel.setProperty("/showMain", false);
                this.oScanModel.setProperty("/showMDE", true);
            } else {
                this.oScanModel.setProperty("/showMDE", false);
                this.oScanModel.setProperty("/showMain", true);
            }
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            this.saveBookingData();
        },

        onPressResignOk: function (sViewMode) { 
            this._onOkClicked();
        },

        onPressRefresh: function () {
            // ---- Reset all components
            this._resetAll();

            if (this.sActiveQMode === "W") {
                this._loadWareHouseData(this.sWN, this.sActiveQueue, this.iWT);
            } else {
                this._loadWareHouseData(this.sWN, this.sActiveQueue, this.iHU);
            }
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

                    if (this.sViewMode === "Handling" && sManNumber !== "") {
                        if (this.sActiveQMode === "W") {
                            if (sManNumber !== "") {
                                if (this.iWT !== "") {
                                    this._loadWhtHuData(sManNumber);
                                } else {
                                    this._loadHuData(sManNumber);
                                }
                            }
                        } else {
                            var sErrMsg = this.oResourceBundle.getText("HuSelectionErr", [sManNumber, this.iHU]);

                            if (this.iHU === sManNumber) {
                                this._loadQuantityData(sManNumber);
                            } else {
                                this.oScanModel.setProperty("/valueManuallyNo", "");
                                this._setFocus(this.idInputHU);

                                tools.alertMe(sErrMsg);

                                return;
                            }
                        }
                    } else if (this.sViewMode === "Quantity") {
                        this._handleQuantityData();                           
                    } else if (this.sViewMode === "LocConf" && sManNumber !== "") {
                        this._loadStorageBinData(sManNumber);
                    }

                    this.iScanModusAktiv = 1;
                }    
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        saveBookingData: function (iDocumentNo) {
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", this.iHU);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var oData    = this.oDisplayModel.getData();
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined && this.oDisplayModel.getData()) {
                BusyIndicator.show(1);

                var sPath = "/WarehouseTask(WarehouseNumber='" + oData.WarehouseNumber + "',WarehouseTaskId='" + oData.WarehouseTaskId + "')";
                var urlParam = { "WarehouseTaskType": "H", "BookConfirm": true, "HandlingUnitId": oData.HandlingUnitId, "TargetQuantity": oData.ActualQuantity};
    
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, urlParam, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    tools.alertMe(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus(that.idInputHU);

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

                                setTimeout(function () {
                                    that._resetAll();
                                    that.onNavBack();
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

	    _loadWareHouseData: function (iWHN, sQueue, iHU) {
            var sErrMsg  = this.oResourceBundle.getText("HandlingUnitErr", iHU);
            var sErrNoDS = this.oResourceBundle.getText("NoDataset", iHU);
            var that = this;
            
            BusyIndicator.show(1);

            // ---- Read the WareHouse Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, iWHN));
                aFilters.push(new sap.ui.model.Filter("QueueId", sap.ui.model.FilterOperator.EQ, sQueue));
                
            var sPath = "/Queue";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, iHU, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTasks"
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results[0].to_WarehouseTasks.results.length > 0) {
                                if (rData.results.length > 0) {
                                    var component = that.InputHU;

                                    if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                        BusyIndicator.hide();

                                        // ---- Coding in case of showing Business application Errors
                                        if (component !== null && component !== undefined) {
                                            tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                        } else {
                                            tools.showMessageError(rData.results[0].SapMessageText, "");
                                        }

                                        that.oScanModel.setProperty("/valueManuallyNo", "");

                                        return;
                                    } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                        // ---- Coding in case of showing Business application Informations
                                        tools.alertMe(rData.results[0].SapMessageText, "");
                                    }
                                }
    
                                let data = rData.results[0].to_WarehouseTasks.results;

                                for (let i = 0; i < data.length; i++) {
                                    let item = data[i];

                                    if (that.sActiveQMode === "H") {
                                        if (item.HandlingUnitId === iHU) {
                                            that._setWareHouseTableData(item, iHU);
                                        }
                                    } else if (that.sActiveQMode === "W") {
                                        if (item.WarehouseTaskId === that.iWT) {
                                            if (item.HandlingUnitId === "") {
                                                that._NoHu = true;
                                            } else {
                                                that._NoHu = false;
                                            }

                                            that._setWareHouseTableData(item, iHU);
                                        }
                                    }
                                }

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.InputHU;

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
                            var component = that.InputHU;

                            if (component !== null && component !== undefined) {
                                tools.showMessageErrorFocus(sErrNoDS, "", component);
                            } else {
                                tools.showMessageError(sErrNoDS, "");
                            }

                            that.oScanModel.setProperty("/valueManuallyNo", "");
                        }
                    }
                });
        },

	    _setWareHouseTableData: function (oData, sManNumber) {
            var sViewMode = this.oScanModel.getProperty("/viewMode");

            // ---- Reset the Display Model
            this.oDisplayModel.setData([]);
            this.oDisplayModel.setData(oData);

            this.iScanModusAktiv = 0;

            // ---- Change the Main focus to HU or Warehouse Task
            if (this.sActiveQMode === "W") {
                this._handleHandlingUnitData(sViewMode, sManNumber);
            } else {
                this._handleHandlingUnitData(sViewMode, sManNumber);
                // this._loadQuantityData(sViewMode, sManNumber);
            }
        },

	    _loadHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var that = this;

            this.iHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            BusyIndicator.show(1);

            // ---- Read the HU Data from the backend
            var sPath = "/HandlingUnit(WarehouseNumber='" + this.sWN + "',HandlingUnitId='" + this.iHU + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTask"
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.InputHU;

                                that._resetAll();
                                
                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                that.oScanModel.setProperty("/valueManuallyNo", "");

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }

                            // ---- Check for QS relevant HU
                            if (rData.InspectionLot !== "" && rData.InspectionType !== "") {
                                that.QsRelevantHU = true;
                            } else {
                                that.QsRelevantHU = false;
                            }

                            that.StatusOpenWarehouseTask = rData.StatusOpenWarehouseTask;
                            that._setHuData(rData, sManNumber);

                            BusyIndicator.hide();
                        } else {
                            BusyIndicator.hide();

                            // ---- Coding in case of showing Business application Errors
                            var sErrMsg   = that.oResourceBundle.getText("HandlingUnitErr", sManNumber);
                            var component = that.byId("idInput_Location");

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

	    _loadWhtHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var that = this;

            this.iHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            BusyIndicator.show(1);

            // ---- Read the HU Data from the backend
            var sPath = "/HandlingUnit";

            var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("HandlingUnitId", sap.ui.model.FilterOperator.EQ, this.iHU));
                aFilters.push(new sap.ui.model.Filter("CheckWhtCompatibility", sap.ui.model.FilterOperator.EQ, this.iWT));

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTask"
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                // ---- Check for complete final booking
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.InputHU;

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }

                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }

                                for (let i = 0; i < rData.results.length; i++) {
                                    var item = rData.results[i];

                                    if (item.HandlingUnitId === sManNumber) {
                                        // ---- Check for QS relevant HU
                                        if (item.InspectionLot !== "" && item.InspectionType !== "") {
                                            that.QsRelevantHU = true;
                                        } else {
                                            that.QsRelevantHU = false;
                                        }

                                        that.iHuQuantity = item.Quantity;
                                        that.StatusOpenWarehouseTask = item.StatusOpenWarehouseTask;
                                        that._setHuData(item, sManNumber);
                                    }
                                }
                                
                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var sErrMsg   = that.oResourceBundle.getText("HandlingUnitErr", sManNumber);
                                var component = that.byId("idInput_Location");
    
                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(sErrMsg, "", component);
                                } else {
                                    tools.showMessageError(sErrMsg, "");
                                }
    
                                that.oScanModel.setProperty("/valueManuallyNo", "");
                            }
                            
                            BusyIndicator.hide();
                        } else {
                            BusyIndicator.hide();

                            // ---- Coding in case of showing Business application Errors
                            var sErrMsg   = that.oResourceBundle.getText("HandlingUnitErr", sManNumber);
                            var component = that.byId("idInput_Location");

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

	    _setHuData: function (oData, sManNumber) {
            if (this._NoHu) {
                // ---- External Queue
                if (oData !== null && oData !== undefined) {
                    var sMaterial = oData.Material;
    
                    if (sMaterial !== null && sMaterial !== undefined && sMaterial === this.oDisplayModel.getProperty("/MaterialNo")) {
                        this.oDisplayModel.setProperty("/HandlingUnitId", sManNumber);
                    } else {
                        var sErrNoIndentMaterial = this.oResourceBundle.getText("NoIndentMaterial", sMaterial);
    
                        tools.alertMe(sErrNoIndentMaterial);
    
                        return;
                    }
                } else if (oData.to_WarehouseTask !== null && oData.to_WarehouseTask !== undefined) {
                    var sMaterial = oData.to_WarehouseTask.MaterialNo;
    
                    if (sMaterial !== null && sMaterial !== undefined && sMaterial === this.oDisplayModel.getProperty("/MaterialNo")) {
                        this.oDisplayModel.setProperty("/HandlingUnitId", sManNumber);
                    } else {
                        var sErrNoIndentMaterial = this.oResourceBundle.getText("NoIndentMaterial", sMaterial);
    
                        tools.alertMe(sErrNoIndentMaterial);
    
                        return;
                    }
                } else {
                    var sErrNoHuData = this.oResourceBundle.getText("NoHuData", sManNumber);
    
                    tools.alertMe(sErrNoHuData);
    
                    return;
                }
            } else {
                // ---- Internal Queue
                if (oData.to_WarehouseTask !== null && oData.to_WarehouseTask !== undefined) {
                    var sMaterial = oData.to_WarehouseTask.MaterialNo;
    
                    if (sMaterial !== null && sMaterial !== undefined && sMaterial === this.oDisplayModel.getProperty("/MaterialNo")) {
                        this.oDisplayModel.setProperty("/HandlingUnitId", sManNumber);
                    } else {
                        var sErrNoIndentMaterial = this.oResourceBundle.getText("NoIndentMaterial", sMaterial);
    
                        tools.alertMe(sErrNoIndentMaterial);
    
                        return;
                    }
                } else if (oData !== null && oData !== undefined) {
                    var sMaterial = oData.Material;
    
                    if (sMaterial !== null && sMaterial !== undefined && sMaterial === this.oDisplayModel.getProperty("/MaterialNo")) {
                        this.oDisplayModel.setProperty("/HandlingUnitId", sManNumber);
                    } else {
                        var sErrNoIndentMaterial = this.oResourceBundle.getText("NoIndentMaterial", sMaterial);
    
                        tools.alertMe(sErrNoIndentMaterial);
    
                        return;
                    }
                } else {
                    var sErrNoHuData = this.oResourceBundle.getText("NoHuData", sManNumber);
    
                    tools.alertMe(sErrNoHuData);
    
                    return;
                }
            }

            // ---- Change the Scan Model
            var sSpecialWarehouse = this.oResourceBundle.getText("SpecialWarehouse");
            var sErrHuQuantity = this.oResourceBundle.getText("ErrHuQuantity");
            
            if (this.sActiveQMode === "W") {
                // ---- Special Check for Warehouse L001
                if (this.sWN === sSpecialWarehouse) {
                    var iQuantity   = parseInt(this.oDisplayModel.getProperty("/TargetQuantity"), 10);
                    var iHuQuantity = parseInt(this.iHuQuantity, 10);

                    if (iHuQuantity > iQuantity) {
                        BusyIndicator.hide();

                        // ---- Coding in case of showing Business application Errors
                        var component = that.InputHU;

                        if (component !== null && component !== undefined) {
                            tools.showMessageErrorFocus(sErrHuQuantity, "", component);
                        } else {
                            tools.showMessageError(sErrHuQuantity, "");
                        }

                        this.onPressRefresh();

                        return;
                    } else {
                        // ---- For External Oueues no Quantity change is allowed and ActualQuantity is like TargetQuantity
                        this.ActualQuantity = this.iHuQuantity;
                        this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);

                        // ---- Change viewMode to LocConf
                        this.oScanModel.setProperty("/viewHu", false);

                        this._resetQuantity();
                    }
                } else {
                    // ---- For External Oueues no Quantity change is allowed and ActualQuantity is like TargetQuantity
                    this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
                    this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);

                    // ---- Change viewMode to LocConf
                    this.oScanModel.setProperty("/viewHu", false);

                    this._resetQuantity();
                }
            } else {
                this._loadQuantityData(sManNumber);
            }
        },

        _handleHandlingUnitData: function (sManNumber) {
            this.oScanModel.setProperty("/viewMode", "Handling");
            this.oScanModel.setProperty("/viewHu", true);
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewLocConf", false);

            var that = this;

            setTimeout(function () {
                that._setFocus(that.idInputHU);
            }, 1000);            
        },

        _loadQuantityData: function (sManNumber) {
            this.oScanModel.setProperty("/viewMode", "Quantity");
            this.oScanModel.setProperty("/viewQuantity", true);
            this.oScanModel.setProperty("/viewHu", false);
            this.oScanModel.setProperty("/viewLocConf", false);

            this._setFocus(this.idInputQuantity);
        },

		_handleQuantityData: function () {
            var sErrMesg = this.oResourceBundle.getText("OnlySmallQuantities");
            var sValMesg = this.oResourceBundle.getText("OnlyNumericQuantities");
            var iQuantity = parseInt(this.oDisplayModel.getProperty("/TargetQuantity"), 10);
            
            var that = this;

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            if (this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                var check = tools._isNumeric(this.oScanModel.getProperty("/valueManuallyNo"));

                if (!check) {
                    this.InputQuantity.setValueState("Error");
                    this.InputQuantity.setValueStateText(sValMesg);

                    setTimeout(function () {
                        that.InputQuantity.setValueState("None");
                        that.InputQuantity.setValueStateText("");

                        that.oScanModel.setProperty("/valueManuallyNo", "");
    
                        // ---- Set Focus to main Input field
                        that._setFocus(this.idInputQuantity);
                    }, 3000);            

                    return;
                } else {
                    this.InputQuantity.setValueState("None");
                    this.InputQuantity.setValueStateText("");
                }
                
                var iActualQuantity = parseInt(this.oScanModel.getProperty("/valueManuallyNo"), 10);
                
                if (iActualQuantity > iQuantity) {
                    tools.alertMe(sErrMesg);

                    this.oScanModel.setProperty("/valueManuallyNo", "");
               
                    // ---- Set Focus to default Input field
                    this._setFocus(this.idInputQuantity);

                    return;
                } else if (iActualQuantity < iQuantity) {
                    this.ActualQuantity = this.oScanModel.getProperty("/valueManuallyNo");

                    this.onQuantityScanOpen();
                } else if (iActualQuantity === iQuantity) {
                    this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
                    this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
               
                    // ---- Set Focus to default Input field
                    this.oScanModel.setProperty("/valueManuallyNo", "");
                    this._setFocus(this.idInputQuantity);
                }
            } else {
                this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
                this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            }
           
            // ---- Set Focus to default Input field
            this._resetQuantity();
		},

	    _loadStorageBinData: function (sManNumber) {
            this.sStorageBin = sManNumber.toUpperCase();

            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sErrMsg = this.oResourceBundle.getText("StorageBinErr", this.sStorageBin);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("StorageBinID", sap.ui.model.FilterOperator.EQ, this.sStorageBin));

            BusyIndicator.show(1);

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
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId(that.idInputLocation);

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }

                                    that.oScanModel.setProperty("/valueManuallyNo", "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];                                    
                                    
                                    that._handleFinalData(data.StorageBinID);
                                }

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();
                                
                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId(that.idInputLocation);

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

        _handleFinalData: function (sManNumber) {
            var sErrMesg  = this.oResourceBundle.getText("StorageBinErr", sManNumber);
            var tSTime    = this.oResourceBundle.getText("ShowTime");
            var check = false;
            var id    = this.idInputLocConf;
            var that  = this

            check = this._checkDestStorageLocation(sManNumber);

            this.oScanModel.setProperty("/viewMode", "LocConf");

            if (check) {
                this.oScanModel.setProperty("/viewHu", false);
                this.oScanModel.setProperty("/viewQuantity", false);
                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/refresh", true);
                this.oScanModel.setProperty("/ok", false);
            } else {
                id = this.idInputLocConf;

                this.oScanModel.setProperty("/viewHu", false);
                this.oScanModel.setProperty("/viewQuantity", false);
                this.oScanModel.setProperty("/viewLocConf", true);
                this.oScanModel.setProperty("/booking", false);
                this.oScanModel.setProperty("/refresh", true);
                this.oScanModel.setProperty("/ok", true);

                this.oScanModel.setProperty("/showErr", true);
                this.oScanModel.setProperty("/showErrText", sErrMesg);
            }

            if (!check) {
                setTimeout(function () {
                    that.oScanModel.setProperty("/showErr", false);
                    that.oScanModel.setProperty("/showErrText", "");

                    that._setFocus(id);
                }, tSTime);            
            }         
        },

        _checkDestStorageLocation: function (sManNumber) {
            var oModel = this.oDisplayModel;
            var check  = false;

            // ---- ToDo: Check from Backend for not identically dest. Storage Location
            if (oModel !== null && oModel !== undefined) {
                if (oModel.getData() !== null && oModel.getData() !== undefined) {
                    var oData = oModel.getData();

                    if (oData.DestinationStorageBin === sManNumber) {
                        check = true;
                    }
                }
            }

            return check;
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

            this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
            this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            this._resetQuantity();
        },

		onQuantityScanAfterClose: function () {
		},

		onQuantityScanSave: function () {
			if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            this._resetQuantity();
		},


        // --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    var sSuffix     = oEvent.getParameter("valueSuffix");
                    var iScanAktiv  = oEvent.getParameter("iScanModusAktiv");
                    
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for Data Matix Code
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.trim()
                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                    }
                    
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        // ---- Check for Data Matix Code
                        sScanNumber = this._handleDMC(this.sViewMode, sScanNumber);

                        sScanNumber = sScanNumber.trim()
                        sScanNumber = sScanNumber.toUpperCase();
                        
                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                        sManNumber = sScanNumber;
                    }

                    if (iScanAktiv !== null && iScanAktiv !== undefined && iScanAktiv !== "") {
                        this.iScanModusAktiv = iScanAktiv;
                    } else {
                        this.iScanModusAktiv = 2;
                    }

                    if (this.sViewMode === "Handling" && this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                        if (this.sActiveQMode === "W") {
                            if (sManNumber !== "") {
                                this._loadHuData(sManNumber);
                            }
                        } else {
                            var sErrMsg = this.oResourceBundle.getText("HuSelectionErr", [sManNumber, this.iHU]);

                            if (this.iHU === sManNumber) {
                                this._loadQuantityData(sManNumber);
                            } else {
                                this.oScanModel.setProperty("/valueManuallyNo", "");
                                this._setFocus(this.idInputHU);

                                tools.alertMe(sErrMsg);

                                return;
                            }
                        }
                    } else if (this.sViewMode === "Quantity") {
                         this._handleQuantityData();                           
                    } else if (this.sViewMode === "LocConf" && this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                        this._loadStorageBinData(sManNumber);
                    }
                }    
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");
 		},

		onScan: function (sViewMode) {
            if (sViewMode !== null && sViewMode !== undefined && sViewMode !== "") {
                this.sViewMode = sViewMode;
            } else {
                this.sViewMode = this.oScanModel.getProperty("/viewMode");
            }

			this.oScanner.openScanDialog("Resign", sViewMode);
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
            this.getRouter().navTo("hu", { "whn": this.sWN, "queue": this.sActiveQueue, "qmode": this.sActiveQMode }, true);
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
            var sRoute = "Resign";
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                // var controlF2 = that.byId(that.idInputHU);

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 13: // ---- Enter Key
                            // evt.preventDefault();

                            // if (sRoute === "Resign") {
                            //     if (that.iScanModusAktiv < 2) {
                            //         that.onPressResignOk();
                            //     } else {
                            //         that.iScanModusAktiv = 0;
                            //     }
                            // }

                            // evt.keyCode = null;

                            break;			                
                        case 112: // ---- F1 Key
                            // evt.preventDefault();
                            // var controlF1 = that.BookButton;

                            // if (sRoute === "Resign") {
                            //     if (controlF1 && controlF1.getEnabled()) {
                            //         that.onPressBooking();
                            //     }
                            // }
                            
                            break;			                
                        case 113: // ---- F2 Key
                            // evt.preventDefault();
    
                            // if (sRoute === "Resign") {
                            //     if (that.iScanModusAktiv < 2) {
                            //         if (controlF2 && controlF2.getEnabled()) {
                            //             controlF2.fireChange();
                            //         }
                            //     }
                            // }

                            // evt.keyCode = null;

                            break;			                
                        case 114: // ---- F3 Key
                            // evt.preventDefault();

                            // if (sRoute === "Resign") {
                            //     that.onNavBack();
                            // }

                            break;			                
                        case 115: // ---- F4 Key
                            // evt.preventDefault();

                            // if (sRoute === "Resign") {
                            //     that.onPressRefresh();
                            // }
                            
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
            this.oScanModel.setProperty("/viewMode", "LocConf");
            this.oScanModel.setProperty("/viewLocConf", true);
            this.oScanModel.setProperty("/ok", true);
            this.oScanModel.setProperty("/valueManuallyNo", "");

            this.InputQuantity.setValueState("None");
            this.InputQuantity.setValueStateText("");

            this._setFocus(this.idInputLocConf);
        },

        _resetAll: function () {
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");
            var sViewTitleExt = this.oResourceBundle.getText("CaptureExternal");
            var sTitle = "";

            if (this.sActiveQMode === "W") {
                sTitle = sViewTitleExt;
            } else {
                sTitle = sViewTitleInt;
            }

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "captionResign":   sTitle,
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewStorage":     false,
                "viewHu":          true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueSuffix":     "",
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);
                
            // ---- Check for MDE device
            if (this.bMDE) {
                this.oScanModel.setProperty("/showMain", false);
                this.oScanModel.setProperty("/showMDE", true);
            } else {
                this.oScanModel.setProperty("/showMDE", false);
                this.oScanModel.setProperty("/showMain", true);
            }

            this.InputQuantity.setValueState("None");
            this.InputQuantity.setValueStateText("");

            this.sScanType  = "";
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});