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
	"z/recweforeign/controls/ExtScanner",
	"z/recweforeign/model/formatter",
	"z/recweforeign/utils/tools",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
	"sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.recweforeign.";
    var _fragmentPath   = "z.recweforeign.view.fragments.";
	var _sAppModulePath = "z/recweforeign/";

    var APP = "REC_WE_FORN";
 
 
    return Controller.extend("z.recweforeign.controller.RecWeForeign", {

 		// ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools:  tools,


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
            this.sScanType       = "";
            this.sShellSource    = "#Shell-home";
            this.oDeliveryData   = {};
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the UI Tables
            this.MaterialInfoTable = this.byId("idTableMaterialInfo");
            this.PackageListTable  = this.byId("idTablePackageList");

            // ---- Define the Input Fields
            this.idInputHU = "";

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
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "storno":          false,
                "ok":              true,
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "subTitleStorno":  "",
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
            this.getRouter().getRoute("main").attachPatternMatched(this._onObjectMatched, this);
        },

        // --------------------------------------------------------------------------------------------------------------------

        onBeforeRendering: function () {
        },

        onAfterRendering: function () {
            this._handleInputFields();
        },

        onExit: function () {
            if (this.byId("idInput_HU"))    { this.byId("idInput_HU").destroy(); }
            if (this.byId("idInputMDE_HU")) { this.byId("idInputMDE_HU").destroy(); }
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

            // ---- Check for MDE device
            this._handleMDE();

            // ---- Set Focus to main Input field
            this._setFocus(this.idInputHU);
        },

        _handleInputFields: function () {
            // ---- Check for MDE device
            this.bMDE = tools.getScreenResolution(this.getModel("device"), "phone");

            if (this.bMDE) {
                this.idInputHU = "idInputMDE_HU";
    
                this.InputHU = this.byId("idInputMDE_HU");

                this.MaterialInfoTable = this.byId("idTableMaterialInfoMDE");
                this.PackageListTable  = this.byId("idTablePackageListMDE");
            } else {
                this.idInputHU = "idInput_HU";

                this.MaterialInfoTable = this.byId("idTableMaterialInfo");
                this.PackageListTable  = this.byId("idTablePackageList");
            }

            this.InputHU.onsapenter = ((oEvent) => { this._onOkClicked(); });
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
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _bookHuMissingData: function (oTable) {
            var smallAmountHint = this.oResourceBundle.getText("HandlingSmallAmountHint");
            var oData = oTable.getModel().getData();
            var iODataLength = oData.length;
            var iCounter     = 1;

            // ---- Update the HU Data to the backend
            if (oData.length > 0) {
                BusyIndicator.show(1);

                this.oModel.setDeferredGroups(["huListGroup"]);
                this.oModel.setUseBatch(true);

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
                                
                                BusyIndicator.hide();

                                tools.handleODataRequestFailed(oError, resp, true);
                            },
                            success: function (rData, oResponse) {
                                that.oModel.setUseBatch(false);
    
                                if (iCounter === iODataLength) {
                                    that.oScanModel.setProperty("/showOk", true);
                                    that.oScanModel.setProperty("/showOkText", smallAmountHint);

                                    that.iScanModusAktiv = 0;
                                    that._reloadHuData(oTable);
                                }
    
                                iCounter = iCounter + 1;

                                BusyIndicator.hide();
                            }
                        }); 
                    } else {
                        BusyIndicator.hide();

                        iODataLength = iODataLength - 1;
                    }
                }
            }
        },

        saveBookingData: function (iDocumentNo) {
            var iDocumentNo = this.oDisplayModel.getProperty("/DocumentNo");
            var iDeliveryNo = this.oDisplayModel.getProperty("/DeliveryNo");
            var sOkMesg     = this.oResourceBundle.getText("OkMesBooking", iDeliveryNo);
            var sErrMesg    = this.oResourceBundle.getText("ErrorBooking", iDocumentNo);
            var tSTime = this.oResourceBundle.getText("ShowTime");
            var that   = this;

            if (this.oDeliveryData !== null && this.oDeliveryData !== undefined && iDocumentNo === this.oDeliveryData.DocumentNo) {
                BusyIndicator.show(1);

                var sDeliveryNo = this.oDeliveryData.DocumentNo;
                
                delete this.oDeliveryData.HandlingUnit;

                this.oDeliveryData.BookGoodsReceipt = true;

                var sPath = "/Delivery(DocumentNo='" + sDeliveryNo + "')";
    
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, that.oDeliveryData, {
                        error: function(oError, resp) {
                            BusyIndicator.hide();

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            if (parseInt(oResponse.statusCode, 10) === 202 || parseInt(oResponse.statusCode, 10) === 204) {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                BusyIndicator.hide();

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus(that.idInputHU);
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

        _CancelHuData: async function () {
            var sOkMesg  = this.oResourceBundle.getText("OkMesCancellation");
            var sErrMesg = this.oResourceBundle.getText("ErrorCancellation");
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var oTable;

            // ---- Get Table data
            if (this.ScanModus === "A") {
                oTable = this.MaterialInfoTable;
            } else {
                oTable = this.PackageListTable;
            }

            var oData        = oTable.getModel().getData();
            var iODataLength = oData.length;
            var iCounter     = 1;

            // ---- Update the HU Data to the backend
            if (oData.length > 0) {
                BusyIndicator.show(1);

                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (data.StatusUnload === true) {
                        var sPath = "/DeliveryHU(WarehouseNumber='" + data.WarehouseNumber + "',HandlingUnit='" + data.HandlingUnit + "')";
                        var that  = this;

                        var urlParam = { "BookUnloadCancel": true };

                        // ---- First step: Get the internal asyncron data
                        await this._genericUpdateOData(sPath, urlParam).then ( function (oResponse) {
                            // ---- Check for complete final booking
                            if (iCounter === iODataLength) {
                                if (parseInt(oResponse.statusCode, 10) === 202 || parseInt(oResponse.statusCode, 10) === 204) {
                                    that.oScanModel.setProperty("/showOk", true);
                                    that.oScanModel.setProperty("/showOkText", sOkMesg);       
                                    
                                    that._resetCanceledHuData(oTable);
    
                                    BusyIndicator.hide();

                                    // ---- Do nothing -> Good case
                                    setTimeout(function () {
                                        that._resetAll();
                        
                                        // ---- Set Focus to main Input field
                                        that._setFocus(that.idInputHU);
                                    }, tSTime);            
                                } else {
                                    BusyIndicator.hide();

                                    tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                                }
                            }

                            iCounter = iCounter + 1;
                        }).catch((oError) => {
                            BusyIndicator.hide();
            
                            tools.showMessageError(oError.message);
                            // tools.handleODataRequestFailed(oError, oError.responseText, true); 
                        })
                    } else {
                        iODataLength = iODataLength - 1;

                        BusyIndicator.hide();
                    }
                }

                if (iODataLength === 0) {
                    tools.alertMe(sErrMesg);
                }
            } else {
                BusyIndicator.hide();

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _genericUpdateOData: async function (sPath, data) {
            BusyIndicator.show(1);

            // ---- Create new Production Order
			return new Promise((resolve, reject) => {
				try {
                    var oModel = this._getServiceUrl()[0];
                        oModel.update(sPath, data, {
                            error: function(oError, resp) {
                                reject(oError);
                            },
                            success: function(rData, oResponse) {
                                if (rData !== null && rData !== undefined) {
                                    resolve(rData);
                                } else if (oResponse !== null && oResponse !== undefined) {
                                    resolve(oResponse);
                                } else {
                                    resolve("Success");
                                }
                            }
                        });
                } catch (oError) { 
                    BusyIndicator.hide();

                    tools.handleODataRequestFailed(oError, oError.responseText, true);
				}
			});
        },

        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading / Set Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadUserData: function () {
            var sParam = encodeURIComponent("/SCWM/LGN");
            var that   = this;

            this.sWN = "";

            // ---- Read the User Data from the backend
            var sPath = "/UserParameter('" + sParam + "')";

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
			    oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");

                                BusyIndicator.hide();

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (rData !== null && rData !== undefined && rData !== "") {
                            that.sWN = rData.ParameterValue;

                            // ---- Get the Page ID
                            that._getShellSource();
                        }

                        BusyIndicator.hide();
                    }
                });
        },

	    _loadHuData: function (sManNumber) {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
            var sErrMsg = this.oResourceBundle.getText("HandlingUnitErr", this.iHU);
            var that = this;

            this.iHU = sManNumber;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("HandlingUnit", sap.ui.model.FilterOperator.EQ, this.iHU));

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.read("/DeliveryHU", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sManNumber, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    that._resetAll();

                                    BusyIndicator.hide();
    
                                    var component = that.byId("idInput_HU");
    
                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }
    
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

                                BusyIndicator.hide();
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
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

	    _loadDeliveryData: function (sDocumentNo, iHU, oData) {
            var that = this;

            // ---- Read the HU Data from the backend
			var sPath = "/Delivery('" + sDocumentNo + "')?$expand=to_HUs";

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sDocumentNo, true);
                    },
                    success: function(rData, response) {
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                BusyIndicator.hide();

                                var component = that.byId("idInput_HU");

                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

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

                                if (that.bMDE) {
                                    that.byId("idScrollContainerTableA_MDE").setVisible(true);
                                    that.byId("idScrollContainerTableB_MDE").setVisible(false);        
                                } else {
                                    that.byId("idScrollContainerTableA").setVisible(true);
                                    that.byId("idScrollContainerTableB").setVisible(false);        
                                }                    
                            } else {
                                that._setTableDataB(oData, iHU);

                                if (that.bMDE) {
                                    that.byId("idScrollContainerTableA_MDE").setVisible(false);
                                    that.byId("idScrollContainerTableB_MDE").setVisible(true);        
                                } else {
                                    that.byId("idScrollContainerTableA").setVisible(false);
                                    that.byId("idScrollContainerTableB").setVisible(true);        
                                }                    
                            }

                            BusyIndicator.hide();
                        }
                    }
                });
        },

	    _reloadHuData: function (oTable) {
            var that = this;

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("HandlingUnit", sap.ui.model.FilterOperator.EQ, this.iHU));

            var oModel = this._getServiceUrl()[0];
                oModel.read("/DeliveryHU", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, this.iHU, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();
    
                                    var component = that.byId("idInput_HU");
    
                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }
    
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
            this._setFocus(this.idInputHU);
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
            this._setFocus(this.idInputHU);
        },

        _updateStatusAllHUs: async function (oTable, oData) {
            var iODataLength = oData.results.length;
            var iCounter     = 1;
            var that = this;

            // ---- Update the HU Data to the backend
            if (oData.results.length > 0) {
                BusyIndicator.show(1);

                for (let i = 0; i < oData.results.length; i++) {
                    var data = oData.results[i];
                        data.BookUnload = true;

                    var sPath = "/DeliveryHU(WarehouseNumber='" + data.WarehouseNumber + "',HandlingUnit='" + data.HandlingUnit + "')";

                    // ---- First step: Get the internal asyncron data
                    await this._genericUpdateOData(sPath, data).then ( function (rData) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                BusyIndicator.hide();

                                var component = that.byId("idInput_HU");
    
                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

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

                        BusyIndicator.hide();

                    }).catch((oError) => {
                        BusyIndicator.hide();
        
                        tools.handleODataRequestFailed(oError, oError.responseText, true);
                    })
                }
            }
        },

        _updateStatusSingleHU: function (oTable, iHU) {
            var that = this;

            var sPath    = "/DeliveryHU(WarehouseNumber='" + this.sWN + "',HandlingUnit='" + this.iHU + "')";
            var urlParam = { "BookUnload": true };

            BusyIndicator.show(1);

            var oModel = this._getServiceUrl()[0];
                oModel.update(sPath, urlParam, { 
                    error: function (oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, that.iHU, true);
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined) {
                            if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                BusyIndicator.hide();

                                var component = that.byId("idInput_HU");
    
                                if (component !== null && component !== undefined) {
                                    tools.showMessageErrorFocus(rData.SapMessageText, "", component);
                                } else {
                                    tools.showMessageError(rData.SapMessageText, "");
                                }

                                return;
                            } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                        }

                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
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
            var sStatusTextNotOk = this.oResourceBundle.getText("StatusIconNotOk");
            var sStatusIconOk    = this.oResourceBundle.getText("StatusIconOk");
            var sStatusNoSel     = this.oResourceBundle.getText("StatusNotSel");
            var sStatusSel       = this.oResourceBundle.getText("StatusSelect");
 
            // ---- Adding of additional Status flags
            if (oData.results.length > 0) {
                if (this.bMDE) {
                    for (let i = 0; i < oData.results.length; i++) {
                        var data = oData.results[i];
                        
                        if (data.StatusUnload === true) {
                            data.StatusIcon = sStatusIconOk;
                            data.StatusSel  = sStatusSel;
                        } else {
                            data.StatusIcon = sStatusTextNotOk;
                            data.StatusSel  = sStatusNoSel;
                        }
                    }
                }                        
            }

            var oModel = new JSONModel();
                oModel.setData(oData.results);

            oTable.setModel(oModel);

            if (this.bMDE) {
                oTable.bindItems({
                    path: "/",
                    template: oTable.removeItem(0),
                    templateShareable: true
                });
            } else {
                oTable.bindRows("/");
            }
    	},

		_changeTableSettings: function (oTable, iLength) {
            var iMaxRowCount = parseInt(this.oResourceBundle.getText("MaxRowCount"), 10);
            var iRowCount    = parseInt((iLength + 1), 10);

            if (iRowCount > iMaxRowCount) {
                iRowCount = iMaxRowCount;
            }

            if (!this.bMDE) {
                this.MaterialInfoTable.setVisibleRowCount(iRowCount);
            }
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
            var sStatusTextNotOk = this.oResourceBundle.getText("StatusIconNotOk");
            var sStatusIconOk    = this.oResourceBundle.getText("StatusIconOk");
            var sStatusNoSel     = this.oResourceBundle.getText("StatusNotSel");
            var sStatusSel       = this.oResourceBundle.getText("StatusSelect");

            var oModel = oTable.getModel();
            var oData  = oModel.getData();
            var sNote  = 0;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === true) {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusIconOk;
                            data.StatusSel  = sStatusSel;
                        }

                        sNote = sNote + 1;
                    } else {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusTextNotOk;
                            data.StatusSel  = sStatusNoSel;
                        }
                    }
                }
            }

            oTable.setModel(oModel);

            if (sNote === oData.length) {
                this.AllBooked = true;
            } else {
                this.AllBooked = false;
            }
    
            this.oDisplayModel.setProperty("/PSDeliveryNote", sNote + " / " + oData.length);
		},

		_handleLessHuData: function (oTable) {
            var sStatusTextNotOk = this.oResourceBundle.getText("StatusIconNotOk");
            var sStatusIconOk    = this.oResourceBundle.getText("StatusIconOk");
            var sStatusNoSel     = this.oResourceBundle.getText("StatusNotSel");
            var sStatusSel       = this.oResourceBundle.getText("StatusSelect");

            var oData = oTable.getModel().getData();

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === false) {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusTextNotOk;
                            data.StatusSel  = sStatusNoSel;
                        }

                        data.BookMissing = true;
                        data.Status      = "Error";
                    } else if (data.StatusUnload === true) {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusIconOk;
                            data.StatusSel  = sStatusSel;
                        }

                        data.Status = "Success";
                    }
                }
            }

            oTable.getModel().setData(oData);
		},

		_resetLessHuData: function (oTable) {
            var sStatusTextNotOk = this.oResourceBundle.getText("StatusIconNotOk");
            var sStatusIconOk    = this.oResourceBundle.getText("StatusIconOk");
            var sStatusNoSel     = this.oResourceBundle.getText("StatusNotSel");
            var sStatusSel       = this.oResourceBundle.getText("StatusSelect");

            var oData = oTable.getModel().getData();

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];
 
                    if (data.StatusUnload === false) {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusTextNotOk;
                            data.StatusSel  = sStatusNoSel;
                        }

                        data.BookMissing = false;
                        data.Status      = "None";
                    } else if (data.StatusUnload === true) {
                        if (this.bMDE) {
                            data.StatusIcon = sStatusIconOk;
                            data.StatusSel  = sStatusSel;
                        }

                        data.Status = "Success";
                    }
                }
            }

            oTable.getModel().setData(oData);
		},

		_resetCanceledHuData: function (oTable) {
            var sStatusTextNotOk = this.oResourceBundle.getText("StatusIconNotOk");
            var sStatusNoSel     = this.oResourceBundle.getText("StatusNotSel");

            var oData = oTable.getModel().getData();

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var data = oData[i];

                    if (this.bMDE) {
                        data.StatusIcon = sStatusTextNotOk;
                        data.StatusSel  = sStatusNoSel;
                    }

                    data.StatusUnload = false;
                    data.BookMissing = false;
                    data.Status = "None";
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
			
            // ---- Check for MDE screen
            if (this.bMDE) {
                fragmentFile = _fragmentPath + "DialogApproveBookingMDE";
            }		

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

            this._setFocus(this.idInputHU);
		},

		onBookApprovalAfterClose: function () {
            this._setFocus(this.idInputHU);
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
            this._setFocus(this.idInputHU);
		},

        // --------------------------------------------------------------------------------------------------------------------

        onCancellationApprovalOpen: function () {
			var fragmentFile = _fragmentPath + "dialogApproveCancellation";
			var oView = this.getView();
			var that  = this;

            // ---- Check for MDE screen
            if (this.bMDE) {
                fragmentFile = _fragmentPath + "dialogApproveCancellationMDE";
            }		

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

            this._setFocus(this.idInputHU);
		},

		onCancellationkApprovalAfterClose: function () {
            this._setFocus(this.idInputHU);
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
            this._setFocus(this.idInputHU);
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
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "subTitleStorno":  "",
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);

            // ---- Check for MDE device
            if (this.bMDE) {
                this.oScanModel.setProperty("/showMain", false);
                this.oScanModel.setProperty("/showMDE", true);

                // ---- Reset the Scroll container
                this.byId("idScrollContainerTableA_MDE").setVisible(true);
                this.byId("idScrollContainerTableB_MDE").setVisible(false);
            } else {
                this.oScanModel.setProperty("/showMDE", false);
                this.oScanModel.setProperty("/showMain", true);

                // ---- Reset the Scroll container
                this.byId("idScrollContainerTableA").setVisible(true);
                this.byId("idScrollContainerTableB").setVisible(false);
            }

			// ---- Reset the UI Table A
            if (this.MaterialInfoTable !== null && this.MaterialInfoTable !== undefined) {
                if (this.MaterialInfoTable.getBusy()) {
                    this.MaterialInfoTable.setBusy(!this.MaterialInfoTable.getBusy());
                }

                this.MaterialInfoTable.setModel(oModel);

                if (!this.bMDE) {
                    this.MaterialInfoTable.setVisibleRowCount(1);
                }
            }

            // ---- Reset the UI Table B
            if (this.PackageListTable !== null && this.PackageListTable !== undefined) {
                if (this.PackageListTable.getBusy()) {
                    this.PackageListTable.setBusy(!this.PackageListTable.getBusy());
                }
            }

            this.iScanModusAktiv = 0;
            this.sScanType = "";

            // ---- Set Focus to main Input field
            this._setFocus(this.idInputHU);
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});