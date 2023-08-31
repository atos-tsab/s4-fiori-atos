/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Loading internal Rearrangements
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
    "z/rearrangem/controls/ExtScanner",
    "z/rearrangem/model/formatter",
    "z/rearrangem/utils/tools",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

    // ---- The app namespace is to be define here!
    var _sAppPath       = "z.rearrangem.";
    var _fragmentPath   = "z.rearrangem.view.fragments.";
	var _sAppModulePath = "z/rearrangem/";

    var APP = "RE_ARRANGEM";


    return Controller.extend("z.rearrangem.controller.ReArrangements", {

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

            this.sWN = "";
            this.iHU = "";
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;
            this.QsRelevantHU            = false;
            this.StorageBinDoubleScan    = true;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the Input Fields
            this.InputHU       = this.byId("idInput_HU");
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
                "viewMode":          "Handling",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "saveButton":        false,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "showInspectionLot": false,
                "viewHU":            true,
                // "viewPlant":         false,
                "viewLocConf":       false,
                "viewLoc":           false,
                "valuePlantNo":      "",
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
            this.InputHU.onsapenter       = ((oEvent) => { this._onOkClicked(); });
            this.InputLocation.onsapenter = ((oEvent) => { this._onOkClicked(); });
            this.InputLocConf.onsapenter  = ((oEvent) => { this._onOkClicked(); });
        },

        onExit: function () {
            if (this.byId("idButtonBook_" + APP)) { this.byId("idButtonBook_" + APP).destroy(); }

            if (this.byId("idInput_HU"))       { this.byId("idInput_HU").destroy();       }
            if (this.byId("idInput_Location")) { this.byId("idInput_Location").destroy(); }
            if (this.byId("idInput_LocConf"))  { this.byId("idInput_LocConf").destroy();  }
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
            this._createPrepareStockTransfer();
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

                    if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
                        }
                    } else if (this.sViewMode === "LocConf") {
                        this._handleLocConfData(sManNumber);
                    }
                }    
            }
		},

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _createPrepareStockTransfer: function () {
            var sErrMesg = this.oResourceBundle.getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", this.iHU);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                BusyIndicator.show(1);

                var oData = this.oDisplayModel.getData();
                var sPath   = "/PrepareStockTransfer";

                var urlData = {
                    "WarehouseNumber":      oData.WarehouseNumber,
                    "HandlingUnitId":       oData.HandlingUnitId,
                    "MaterialNo":           oData.Material,
                    "Plant":                oData.Plant,
                    "DMCCode":              "",
                    "Quantity":     	    oData.Quantity,
                    "UnitOfMeasurement":    oData.UnitOfMeasurement,
                    "PurchaseOrderNo":      "",
                    "HandlingUnitId":       oData.HandlingUnitId,
                    "ManufacturingOrderNo": ""
                };

                // ---- Create new Stock Transfer
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
                                    // ---- Coding in case of showing Business application Errors
                                    tools.alertMe(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus("idInput_HU");
    
                                    BusyIndicator.hide();

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
                            that.sWN = rData.ParameterValue;
                        }
                    }
                });
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

            // ---- Read the HU Data from the backend
            var sPath = "/HandlingUnit(WarehouseNumber='" + this.sWN + "',HandlingUnitId='" + this.iHU + "')";
            
            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTask"
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                tools.alertMe(rData.SapMessageText, "");
                                
                                that._resetAll();
                                that._setFocus("idInput_HU");

                                BusyIndicator.hide();
                        
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

                            that._setHuData(rData, sManNumber);

                            BusyIndicator.hide();
                        } else {
                            var sErrMsg = this.oResourceBundle.getText("HandlingUnitErr", that.iHU);

                            BusyIndicator.hide();
                        
                            tools.alertMe(sErrMsg, "");
                        }
                    }
                });
        },

	    _setHuData: function (oData, sManNumber) {
           // ---- Reset the Display Model
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);
            
            if (oData.to_WarehouseTask !== null && oData.to_WarehouseTask !== undefined) {
                var sStorageBin = oData.to_WarehouseTask.DestinationStorageBin;

                if (sStorageBin !== null && sStorageBin !== undefined && sStorageBin !== "") {
                    this.oDisplayModel.setProperty("/Book2StorageBin",  oData.to_WarehouseTask.DestinationStorageBin);
                    this.oDisplayModel.setProperty("/Book2StorageType", oData.to_WarehouseTask.DestinationStorageType);

                    this.StorageBinDoubleScan = false;
                } else {
                    this.StorageBinDoubleScan = true;
                }
            } else {
                this.StorageBinDoubleScan = true;
            }

            // ---- Change the Scan Model
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
                        
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === true) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    BusyIndicator.hide();
                        
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === false) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    BusyIndicator.hide();
                        
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];                                    
                                    
                                    if (data.StorageBinID === that.sStorageBin) {
                                        if (that.QsRelevantHU) {
                                            if (data.to_WarehouseTask !== null && data.to_WarehouseTask !== undefined) {
                                                that.oDisplayModel.setProperty("/Book2StorageBin", data.StorageBinID);
                                                that.oDisplayModel.setProperty("/Book2StorageType", data.StorageType);
                                            }
                                        }
                            
                                        that._setStorageBinData(data);
                                    }
                                }

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();
                        
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

		_setStorageBinData: function (oData) {
            var oDisplayData = this.oDisplayModel.getData();

            // ---- Set the Data for the Model and set the Model to the View
            if (this.sViewMode === "Location") {
                oDisplayData.Book2StorageBin  = oData.StorageBinID;
                oDisplayData.Book2StorageType = oData.StorageType;

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

		_handleHuData: async function (sManNumber) {
            var sErrMesg = this.oResourceBundle.getText("ErrorHuScan", sManNumber);
            var sNoPlant = this.oResourceBundle.getText("NoPlant");
            var sTitle1  = this.oResourceBundle.getText("title1");
            var sTitle2  = this.oResourceBundle.getText("title2");
            var id    = "idInput_Location";
            var oData = this.oDisplayModel.getData();
                oData.viewTitle = sTitle1;
 
            if (oData !== null && oData !== undefined && this.sViewMode === "Handling") {
                oData.HandlingUnitId = sManNumber;
            }

            if (this.QsRelevantHU) {
                oData.showInspectionLot = true;
                oData.viewTitle         = sTitle2;
            }

            // ---- Check for Plant number
            if (this.ActualPlant !== "") {
                var that = this;

                await this._checkPlant(this.ActualPlant).then ( function (check) {
                    if (check) {
                        oData.Plant = that.ActualPlant;

                        that.oDisplayModel.setData(oData);
                    } else {
                        oData.Plant = "";

                        that.oDisplayModel.setData(oData);

                        that.onPlantDataOpen("F");

                        return;
                    }
                })
            } else {
                oData.Plant = "";

                this.oDisplayModel.setData(oData);

                this.onPlantDataOpen("");

                return;
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
                        this.oScanModel.setProperty("/viewMode", "Location");
                        this.oScanModel.setProperty("/viewLoc", true);
                        this.oScanModel.setProperty("/viewHU", false);
                    }
                }
            }

            // ---- Set Focus to main Input field
            this._setFocus(id);
		},

        _checkPlant: async function (plant) {
            // ---- Read the Plant Data from the backend
            var sPath = "/Plant(PlantId='" + plant + "')";
            
            // ---- Create new Production Order
			return new Promise((resolve, reject) => {
				try {
                    var oModel = this._getServiceUrl()[0];
                        oModel.read(sPath, {
                            error: function(oError, resp) {
                                reject(false);
                            },
                            success: function(rData) {
                                if (rData !== null && rData !== undefined) {
                                    if (rData.CustomerNo !== "" && rData.SupplierNo !== "" && rData.PlantDescription !== "" && rData.ValuationArea !== "") {
                                        resolve(true);
                                    } else {
                                        resolve(false);
                                    }
                                } else {
                                    resolve(false);
                                }
                            }
                        });
                } catch (oError) { 
                    reject(false);
				}
			});
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

            this.oScanModel.setProperty("/viewHU", false);
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

            if (oDisplayData.Book2StorageBin === sManNumber.toUpperCase()) {
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

		// --------------------------------------------------------------------------------------------------------------------

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
        // ---- Dialog Functions
        // --------------------------------------------------------------------------------------------------------------------

		onPlantDataOpen: function (trigger) {
            var sTitle1 = this.oResourceBundle.getText("PlantContent");
            var sTitle2 = this.oResourceBundle.getText("PlantError");
			var fragmentFile = _fragmentPath + "DialogPlantData";
            var idLable = this.byId("idLabelPlantContent"); // application-Z_RE_ARRANGEM-manage-component---ReArrangements--idLabelPlantContent-text
			var oView = this.getView();
            var sTitle = "";
			var that = this;
			
            if (trigger === "F") {
                sTitle = sTitle2;
            } else {
                sTitle = sTitle1;
            }

            // ---- Starts the Plant Dialog for Handling Units
			if (!this.getView().dialogPlantData) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogPlantData = oDialog;
					oView.dialogPlantData.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogPlantData.open();
				});
			} else {
                oView.dialogPlantData.open();
            }

            if (idLable !== null && idLable !==  undefined) {
                idLable.setText(sTitle);
            }
        },

        onPlantDataClose: function () {
            if (this.getView().dialogPlantData) {
				this.getView().dialogPlantData.close();
			}

            this.oDisplayModel.setProperty("/Plant", "");
            this.ActualPlant = "";
            this._resetAll();
        },

		onPlantDataAfterClose: function () {
            this._setFocus("idInput_HU");
		},

		onPlantDataSave: async function (oEvent) {
			if (this.getView().dialogPlantData) {
				this.getView().dialogPlantData.close();
			}

            this.ActualPlant = this.oScanModel.getProperty("/valuePlantNo");

            var that = this;

            await this._checkPlant(this.ActualPlant).then ( function (check) {
                that.iScanModusAktiv = 1;

                if (check) {
                    that.oDisplayModel.setProperty("/Plant", that.ActualPlant);
                    that._resetPlant()
                } else {
                    that.oDisplayModel.setProperty("/Plant", "");        
                    that.onPlantDataOpen("F");

                    return;
                }
            })            
		},

        onInputPlantChanged: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var source = oEvent.getSource();
                    var key = source.getValue();
    
                    this.iScanModusAktiv = -2;

                    if (key !== null && key !== undefined && key !== "") {
                        this.oScanModel.setProperty("/valuePlantNo", key);
                        this.oScanModel.setProperty("/saveButton", true);
                    } else {
                       this.oScanModel.setProperty("/valuePlantNo", "");
                       this.oScanModel.setProperty("/saveButton", false);
                    }
                }
            }
        },

        onInputPlantLiveChange: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var source = oEvent.getSource();
                    var key = source.getValue();

                    if (source.sId !== null && source.sId !== undefined && source.sId !== "" && key.length === 1) {
                        var plantInput = this.byId(source.sId);
                            plantInput.onsapenter = ((oEvent) => { this.onPlantDataSave(); });
                    }

                    this.iScanModusAktiv = -2;

                    if (key !== null && key !== undefined && key !== "") {
                        this.oScanModel.setProperty("/valuePlantNo", key);
                        this.oScanModel.setProperty("/saveButton", true);
                    } else {
                        this.oScanModel.setProperty("/valuePlantNo", "");
                        this.oScanModel.setProperty("/saveButton", false);
                    }
                }
            }
        },


		// --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            var oScanModel = this.oScanModel;

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
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

                    if (this.sViewMode === "Handling") {
                        this._loadHuData(sManNumber);
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
                        }
                    } else if (this.sViewMode === "LocConf") {
                        this._handleLocConfData(sManNumber);
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
			var pageID  = this.oResourceBundle.getText("PageId");

            if (History.getInstance() !== null && History.getInstance() !== undefined) {
                if (History.getInstance().getPreviousHash() !== null && History.getInstance().getPreviousHash() !== undefined) {
                    var sSpaceHome  = "#Launchpad-openFLPPage?pageId=" + pageID + "&spaceId=" + spaceID;
                    var sShellHome  = "#Shell-home";

                    var sPreviousHash = History.getInstance().getPreviousHash();

                    if (sPreviousHash.includes("pageId=Z_EEWM_PG_MOBILE_DIALOGS&spaceId=Z_EEWM_SP_MOBILE_DIALOGS")) {
                        this.sShellSource = sSpaceHome;
                    } else {
                        this.sShellSource = sSpaceHome;
                    }
                }    
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
                // var controlF2 = that.byId("idInput_HU");

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 13: // ---- Enter Key
                            // evt.preventDefault();

                            // if (that.iScanModusAktiv < 2 && that.iScanModusAktiv > -1) {
                            //     that.onPressOk();
                            // } else if (that.iScanModusAktiv === -2) {
                            //     that.onPlantDataSave();
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
            var id = "idInput_HU";

            if (this.sViewMode === "Handling") { 
                id = "idInput_HU";
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

            this.ActualPlant = "";

            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                // ---- Check for Data Matix Code
                var check = tools.checkForDataMatrixArray(sManNumber);

                // ---- Check for DMC All parameter
                if (check[0] === true) {
                    if (sViewMode === "Material") {
                        sDMC = check[1];
                    } else if (sViewMode === "Plant") {
                        sDMC = check[2];
                    } else if (sViewMode === "Handling") {
                        sDMC = check[5];
                        
                        this.ActualPlant = check[2];
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

        _resetPlant: function () {
            // ---- Reset the Quantity view
            this.oScanModel.setProperty("/viewHU", false);
            this.oScanModel.setProperty("/viewMode", "Location");
            this.oScanModel.setProperty("/viewLoc", false);
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueManuallyNo", "");

            this._handleFeedbackData();
        },

        _resetAll: function () {
            var sTitle = this.oResourceBundle.getText("title");

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = {
                "viewMode":          "Handling",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "saveButton":        false,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "showInspectionLot": false,
                "viewHU":            true,
                "viewLocConf":       false,
                "viewLoc":           false,
                "valuePlantNo":      "",
                "valueManuallyNo":   ""
            };

            this.oScanModel.setData(oData);

            // ---- Reset of parts
            this.iBookCount = 0;
            this.QsRelevantHU            = false;
            this.StorageBinDoubleScan    = true;

            // ---- Set Focus to main Input field
            this._setFocus("idInput_HU");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});