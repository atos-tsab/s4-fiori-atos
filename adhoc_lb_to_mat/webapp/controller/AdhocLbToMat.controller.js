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
    "z/adhoclbtomat/controls/ExtScanner",
    "z/adhoclbtomat/model/formatter",
    "z/adhoclbtomat/utils/tools",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

    // ---- The app namespace is to be define here!
    var _sAppPath       = "z.adhoclbtomat.";
    var _fragmentPath   = "z.adhoclbtomat.view.fragments.";
	var _sAppModulePath = "z/adhoclbtomat/";

    var APP = "ADHOC_LB_TOMA";


    return Controller.extend("z.adhoclbtomat.controller.AdhocLbToMat", {

        // ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools: tools,


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Init:
        // --------------------------------------------------------------------------------------------------------------------

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

            this.sWN    = "";
            this.iMat   = "";
            this.sLType = "";
            this.sViewMode       = "Material";
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the Input Fields
            this.InputMat      = this.byId("idInput_Material");
            this.InputLocation = this.byId("idInput_Location");
        },

        _initLocalModels: function () {
            var sTitle = this.oResourceBundle.getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":          "Material",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewMat":           true,
                "viewLoc":           false,
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
            this.InputMat.onsapenter      = ((oEvent) => { this._onOkClicked(); });
            this.InputLocation.onsapenter = ((oEvent) => { this._onOkClicked(); });
        },

        onExit: function () {
			if (this.byId("idButtonBook_" + APP)) { this.byId("idButtonBook_" + APP).destroy(); }

            if (this.byId("idInput_Material")) { this.byId("idInput_Material").destroy(); }
            if (this.byId("idInput_Location")) { this.byId("idInput_Location").destroy(); }
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
                    var sManNumber = oScanData.valueManuallyNo.trim();
                    
                    this.sViewMode = oScanData.viewMode;
 
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for DMC All parameter
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Material") {
                        if (sManNumber !== "") {
                            this._loadMaterialData(sManNumber);
                        }
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
                        }
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _createWarehouseTask: function () {
            var sWareTaskParam = this.oResourceBundle.getText("WarehouseTaskTypeParam", this.iMat);
            var sErrMsgHU = this.oResourceBundle.getText("HandlingUnitErr", this.iMat);
            var sErrMesg  = this.oResourceBundle.getText("ErrorBooking", this.iMat);
            var sOkMesg   = this.oResourceBundle.getText("OkMesBooking", this.iMat);
            var tSTime    = this.oResourceBundle.getText("ShowTime");
            var that = this;

            // ---- Check for HU for Material
            if (this.iHU === "") {
                this.oScanModel.setProperty("/refresh", true);

                tools.showMessageError(sErrMsgHU, "");
                
                return;
            }

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/WarehouseTask";
                var urlData = {
                    "WarehouseNumber":       oData.WarehouseNumber,
                    "WarehouseTaskType":     sWareTaskParam,
                    "HandlingUnitId":        this.iHU,
                    "BookConfirm":           false,
                    "BookMoveHu":            true,
                    "TargetQuantity":        oData.Quantity,
                    "DestinationStorageBin": oData.StorageBinID
                };

                // ---- Create new Warehouse Task
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            that.oScanModel.setProperty("/refresh", true);

                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus("idInput_Material");
    
                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                                parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                                BusyIndicator.hide();

                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Material");
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
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sLType1 = this.oResourceBundle.getText("LType1");
            var sLType2 = this.oResourceBundle.getText("LType2");
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

                            if (that.sWN === "L007") {
                                that.sLType = sLType1;
                            } else if (that.sWN === "L009") {
                                that.sLType = sLType2;
                            } else {
                                that.sLType = "";
                            }
                        }
                    }
                });
        },

	    _loadMaterialData: function (sManNumber) {
            this.iMat = sManNumber;

            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var aStockType = tools.splitStringIntoArray(this.oResourceBundle.getText("StockTypeRange"), ",");
            var sStockType = this.oResourceBundle.getText("StockTypeParam");
            var sErrMsg = this.oResourceBundle.getText("MaterialErr", this.iMat);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
            BusyIndicator.show(1);

			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, this.iMat));
                aFilters.push(new sap.ui.model.Filter("StatusOpenWarehouseTask", sap.ui.model.FilterOperator.EQ, false));
                aFilters.push(new sap.ui.model.Filter("StockTypeLocn", sap.ui.model.FilterOperator.EQ, sStockType));
                aFilters.push(new sap.ui.model.Filter("StorageType", sap.ui.model.FilterOperator.EQ, this.sLType));

            // ---- Special implementation for free Storage Types
            for (let i = 0; i < aStockType.length; i++) {
                var sVal = aStockType[i];

                aFilters.push(new sap.ui.model.Filter("StockType", sap.ui.model.FilterOperator.EQ, sVal));                   
            }

            var sPath = "/HandlingUnit";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    urlParameters: {
                        "$top": 1
                    },
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            var component = that.byId("idInput_Material");

                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === true) {
                                    BusyIndicator.hide();
    
                                    // ---- Coding in case of showing Business application Errors                                    
                                    if (component !== null && component !== undefined) {
                                        tools.showMessageError(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }
    
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === false) {
                                    BusyIndicator.hide();
    
                                    // ---- Coding in case of showing Business application Errors
                                    if (component !== null && component !== undefined) {
                                        tools.showMessageError(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }
    
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            // ---- Start with showing data
                            if (rData.results.length > 0) {
                                that._setMaterialData(rData, sManNumber);

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId("idInput_Material");

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

        _setMaterialData: function (oData, sManNumber) {
            var id = "idInput_Material";

            // ---- Set the Display data to the View            
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData.results[0]);
            this.oDisplayModel.setProperty("/StorageType", "");
            
            // ---- Get the HU data for the scanned Material
            this.iHU = oData.results[0].HandlingUnitId;

            this._handleHuData(sManNumber);
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
            BusyIndicator.show(1);

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
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();
    
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId("idInput_Location");

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageError(rData.results[0].SapMessageText, "", component);
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
                                    
                                    that._setStorageBinData(data, that.sStorageBin);
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

		_setStorageBinData: function (oData, sManNumber) {
            // ---- Set the Data for the Model and set the Model to the View
            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Location") {
                    this.oScanModel.setProperty("/HURequirement", oData.HURequirement);

                    this.oDisplayModel.setProperty("/StorageBinID", oData.StorageBinID);
                    this.oDisplayModel.setProperty("/StorageType", oData.StorageType);

                    this._handleLocationData();
                }
            }
        },

		// --------------------------------------------------------------------------------------------------------------------

		_handleHuData: function (sManNumber) {
            var id = "idInput_Material";
 
            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Material") {
                    // ---- Set Scan Model data
                    this.oScanModel.setProperty("/viewMat", false);
                    this.oScanModel.setProperty("/viewMode", "Location");
                    this.oScanModel.setProperty("/viewLoc", true);
    
                    id = "idInput_Location";
                }
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");

            // ---- Set Focus to main Input field
            this._setFocus(id);
		},

        _handleLocationData: function () {
            var id = "idButtonBookStorage";

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            this.oScanModel.setProperty("/viewMode", "Material");
            this.oScanModel.setProperty("/viewLoc", false);
            this.oScanModel.setProperty("/booking", true);
            this.oScanModel.setProperty("/refresh", true);
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueManuallyNo", "");
    
            // ---- Set Focus to default Input field
            this._setFocus(id);
        },

        _showBookingError: function () {
            var sErrMesg   = this.oResourceBundle.getText("ErrorBooking");
            var oScanModel = this.oScanModel;

            var oScanData  = oScanModel.getData();
                oScanData.showErr     = true;
                oScanData.showErrText = sErrMesg;

            this.oScanModel.setData(oScanData);
            this.oScanModel.refresh();
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
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo").trim();
                    var sScanNumber = oEvent.getParameter("valueScan").trim();
                    
                    this.sViewMode = this.oScanModel.getProperty("/viewMode");                  

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        // ---- Check for Data Matix Code
                        sManNumber = this._handleDMC(this.sViewMode, sManNumber);

                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        // ---- Check for Data Matix Code
                        sScanNumber = this._handleDMC(this.sViewMode, sScanNumber);

                        sScanNumber = sManNumber.toUpperCase();
                        
                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                        sManNumber = sScanNumber;
                    }

                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Material") {
                        if (sManNumber !== "") {
                            this._loadMaterialData(sManNumber);
                        }
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
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
                // var controlF2 = that.byId("idInput_Material");

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
            var id = "idInput_Material";

            if (this.sViewMode === "Material") { 
                id = "idInput_Material";
            } else if (this.sViewMode === "Location") {
                id = "idInput_Location";
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

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = {
                "viewMode":          "Material",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewMat":           true,
                "viewLoc":           false,
                "HURequirement":     "",
                "valueManuallyNo":   ""
            };

            this.oScanModel.setData(oData);

            // ---- Reset of the booking count
            this.iBookCount = 0;

            // ---- Set Focus to main Input field
            this._setFocus("idInput_Material");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});