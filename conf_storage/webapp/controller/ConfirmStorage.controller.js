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
    "z/confstorage/controller/BaseController",
	"z/confstorage/controls/ExtScanner",
	"z/confstorage/model/formatter",
	"z/confstorage/utils/tools",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath = "z.confstorage.view.fragments.";
	var _sAppModulePath = "z/confstorage/";
    var APP = "CONF_STOR";
 
 
    return BaseController.extend("z.confstorage.controller.ConfirmStorage", {

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
            this._initLocalRouting();
        },

        _initLocalVars: function () {
             // ---- Define variables for the License View
            this.oView = this.getView();

            this.iWN = "";
            this.iHU = "";
            this.iBookCount      = 0;
            this.sScanType       = "";
            this.oDeliveryData   = {};
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBookHU");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "HU",
                "booking":         false,
                "feedback":        false,
                "refresh":         true,
                "ok":              false,
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
                "valueMaterialNo": ""
            };

			this.oScanModel     = new JSONModel(oData);
            this.oDisplayModel  = new JSONModel();
            this.oProposalModel = new JSONModel();

            this.getView().setModel(this.oScanModel, "ScanModel");
            this.getView().setModel(this.oDisplayModel, "DisplayModel");
            this.getView().setModel(this.oProposalModel, "ProposalModel");
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
            this._setFocus("idInput_HU");
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            tools.alertMe("Buchen könnte hier starten!");
            var that = this;

            // this._createWarehouseTask();
            setTimeout(function () {
                that.oScanModel.setProperty("/showOk", true);
                that.oScanModel.setProperty("/showOkText", "Die Buchung wurde ordnungsgemäß durchgeführt!");

                setTimeout(function () {
                    that._resetAll();
                }, 3000);            
            }, 6000);            
        },

        onPressConfirmPO: function () {
            this._confirmProductionOrder();
        },

        onPressOk: function () {
            this.onNavToStorage(this.sActiveHU);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;
            var sScanView  = oScanModel.getData().viewMode;

            this.sScanView = sScanView;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sMatNumber = oScanData.valueMaterialNo;
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oScanData.valueMaterialNo.trim();
                        
                        this.iHU = sMatNumber;
                    } else {
                        sMatNumber = "";
                    }

                    var oResult = {
                        "sView":    this.sScanView,
                        "material": sMatNumber
                    };
                    
                    
                    this.iScanModusAktiv = 1;

                    if (this.sScanView === "HU") {
                        this._loadHuData(this.sScanView, oResult.material);
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

		_getConfigurationProposal: function () {
			var that = this;

			// ---- Get Configuration Proposal
			var oProposalData = { 
				OrderID:                   this.oDisplayModel.getProperty("/OrderId"),
				OrderOperation:            this.oDisplayModel.getProperty("/OperationId"),
				Sequence:                  this.oDisplayModel.getProperty("/SequenceId"),
				ActivityIsToBeProposed:    true,
                DateAndTimeIsToBeProposed: true,
                ConfirmationYieldQuantity: this.oDisplayModel.getProperty("/Quantity")
			};
			
			this.getView().setBusy(true);
            var oModel = this._getServiceUrl()[0];
			    oModel.callFunction("/GetConfProposal", { 
                    urlParameters: oProposalData, 
                    method: "POST", 
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true); 
                    },
                    success: function(oData, oResponse) {
                        that.oProposalModel.setData(oData.GetConfProposal);
                        that._resetQuantity();

                        that.getView().setBusy(false);
                    }
			});
		},

        confirmProductionOrder: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorProductionOrder", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesProductionOrder", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oProposalModel !== null && this.oProposalModel !== undefined) {
                var oData = this.oProposalModel.getData();
                    oData.OpWorkQuantityUnit4 = "MIN";
                    oData.OpWorkQuantityUnit5 = "MIN";
                    oData.OpWorkQuantityUnit6 = "MIN";
                    oData.WorkQuantityUnit4ISOCode = "MIN";
                    oData.WorkQuantityUnit5ISOCode = "MIN";
                    oData.WorkQuantityUnit6ISOCode = "MIN";
                    oData.WorkCenter = "17330082";
                
                delete oData.__metadata;
 
                var sPath = "/ProdnOrdConf2";

                // ---- Create new Production Order
                this.getView().setBusy(true);

                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, oData, {
                        error: function(oError, resp) {
                            that.getView().setBusy(false);
                            tools.handleODataRequestFailed(oError, resp, true);

                            that._resetQuantity();
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
                                tools.alertMe(rData.SapMessageText, "");
                                
                                that._resetQuantity();

                                return;
                            } else if (rData !== null && rData !== undefined && rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.alertMe(rData.SapMessageText, "");
                            }
                            
                            that.getView().setBusy(false);

                            // ---- ToDo: Create Handling Unit in good case
                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                                parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                                // ---- Do nothing -> Good case
                                    setTimeout(function () {
                                        that.oScanModel.setProperty("/showOk", true);
                                        that.oScanModel.setProperty("/showOkText", sOkMesg);       

                                        setTimeout(function () {
                                                that._handleFeedbackData();
                                                that.getView().setBusy(false);
                                            }, 3000);        
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

        _createHandlingUnit: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/OrderHU";
                var urlData = {
                    "WarehouseNumber": oData.WarehouseNumber,
                    "HandlingUnitId":  oData.HandlingUnitId
                };

                // ---- Create new Warehouse Task
                this.getView().setBusy(true);

                this.oModel.create(sPath, urlData, {
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true);

                        that._resetQuantity();
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
                            that.getView().setBusy(false);

                            tools.alertMe(rData.SapMessageText, "");
                            
                            that._resetQuantity();
                            
                            return;
                        } else if (rData !== null && rData !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }
                        
                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                            parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                            that.oScanModel.setProperty("/showOk", true);
                            that.oScanModel.setProperty("/showOkText", sOkMesg);       

                            // ---- Do nothing -> Good case
                            setTimeout(function () {
                                that._resetAll();

                                that.getView().setBusy(false);
                
                                // ---- Set Focus to main Input field
                                that._setFocus("idInput_HU");
                            }, tSTime);            
                        } else {
                            that.getView().setBusy(false);

                            tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                        }
                    }
                });
            } else {
                that.getView().setBusy(false);

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },

        _createWarehouseTask: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/WarehouseTask";
                var urlData = {
                    "WarehouseNumber":       oData.WarehouseNumber,
                    "HandlingUnitId":        oData.HandlingUnitId,
                    "BookConfirm":           true,
                    "BookMoveHu":            true,
                    "DestinationStorageBin": oData.Book2StorageBin
                };

                // ---- Create new Warehouse Task
                this.getView().setBusy(true);

                this.oModel.create(sPath, urlData, {
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true);

                        that._resetQuantity();
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
                            that.getView().setBusy(false);

                            tools.alertMe(rData.SapMessageText, "");
                            
                            that._resetAll();
                            that._setFocus("idInput_HU");
                            
                            return;
                        } else if (rData !== null && rData !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }
                        
                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                            parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                            that.oScanModel.setProperty("/showOk", true);
                            that.oScanModel.setProperty("/showOkText", sOkMesg);       

                            // ---- Do nothing -> Good case
                            setTimeout(function () {
                                that._resetAll();

                                that.getView().setBusy(false);
                
                                // ---- Set Focus to main Input field
                                that._setFocus("idInput_HU");
                            }, tSTime);            
                        } else {
                            that.getView().setBusy(false);

                            tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                        }
                    }
                });
            } else {
                that.getView().setBusy(false);

                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
        },


		// --------------------------------------------------------------------------------------------------------------------
		// ---- Special Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		_confirmProductionOrder: function (oData) {
			var that = this;

			if (oData != null && oData !== undefined) {
				this._getProposalData().then((data) => {
					// ---- Set Data model for the Resources
                    if (oData.WorkQuantityUnit4ISOCode === "") { oData.WorkQuantityUnit4SAPCode = ""; }
                    if (oData.WorkQuantityUnit5ISOCode === "") { oData.WorkQuantityUnit5SAPCode = ""; }
                    if (oData.WorkQuantityUnit6ISOCode === "") { oData.WorkQuantityUnit6SAPCode = ""; }

                    delete oData.__metadata;
        
                    var sPath = "/ProdnOrdConf2";
    
                    // ---- Create new Production Order
                    this.getView().setBusy(true);
    tools.alertMe("GetConfProposal Daten ermittelt.\nCreate ProdnOrdConf2 ist noch abgeschaltet!");
                    var oModel = this._getServiceUrl()[0];
                    //     oModel.create(sPath, oData, {
                    //         error: function(oError, resp) {
                    //             that.getView().setBusy(false);

                    //             tools.handleODataRequestFailed(oError, resp, true);
    
                    //             that._resetQuantity();
                    //         },
                    //         success: function(rData, oResponse) {
                    //             // ---- Check for complete final booking
                    //             if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
                    //                 tools.alertMe(rData.SapMessageText, "");
                                    
                    //                 that._resetQuantity();
    
                    //                 return;
                    //             } else if (rData !== null && rData !== undefined && rData.SapMessageType === "I") {
                    //                 // ---- Coding in case of showing Business application Informations
                    //                 tools.alertMe(rData.SapMessageText, "");
                    //             }
                                
                    //             that.getView().setBusy(false);
    
                    //             // ---- ToDo: Create Handling Unit in good case
                    //             if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                    //                 parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                    //                 // ---- Do nothing -> Good case
                    //                     setTimeout(function () {
                    //                         that.oScanModel.setProperty("/showOk", true);
                    //                         that.oScanModel.setProperty("/showOkText", sOkMesg);       
    
                    //                         setTimeout(function () {
                    //                                 that._handleFeedbackData();
                    //                                 that.getView().setBusy(false);
                    //                             }, 3000);        
                    //                     }, tSTime);
                    //             } else {
                    //                 tools.showMessageError(oResponse.statusText, oResponse.statusCode);
                    //             }
                    //         }
                    // });
                }).catch((error) => {
					tools.showMessageError(error.message);
				})
            } else {
                that.oScanModel.setProperty("/showOk", false);
                that.oScanModel.setProperty("/showOkText", "");
                that.oScanModel.setProperty("/showErr", true);
                that.oScanModel.setProperty("/showErrText", sErrMesg);
            }
		},

		_getProposalData: function () {
			var errorMes = this.getResourceBundle().getText("errorText");
			var that = this;

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
                    this.getView().setBusy(true);

                    var oModel = this._getServiceUrl()[0];
                        oModel.callFunction("/GetConfProposal", { 
                            urlParameters: oProposalData, 
                            method: "POST", 
                            error: function(oError, resp) {
                                that.getView().setBusy(false);
        
                                reject(oError);
                            },
                            success: function(oData, oResponse) {
                                resolve(oData);
        
                                that.getView().setBusy(false);
                            }
                    });
				} catch (error) {
					tools.showMessageError(errorMes);
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

			this.oModel.read(sPath, {
				error: function(oError, resp) {
                    tools.handleODataRequestFailed(oError, resp, true);
				},
				success: function(rData, response) {
                    // ---- Check for complete final booking
                    if (rData.SapMessageType === "E" && rData.StatusGoodsReceipt === true) {
                        tools.alertMe(rData.SapMessageText, "");
                    } else if (rData.SapMessageType === "E" && rData.StatusGoodsReceipt === false) {
                        // ---- Coding in case of showing Business application Errors
                        tools.showMessageError(rData.SapMessageText, "");
                    } else if (rData.SapMessageType === "I") {
                        // ---- Coding in case of showing Business application Informations
                    }

					if (rData !== null && rData !== undefined && rData !== "") {
                        that.sWN = rData.ParameterValue;
                    }
				}
			});
        },

	    _loadHuData: function (sScanView, iHU) {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var that = this;

            this.sActiveHU = iHU;
            this.iWN = "L007";

            // ---- Check for Warehouse Number
            if (this.iWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- ToDo:
            // this._setDisplayData(sScanView, iHU);
            // return;

            // ---- Read the HU Data from the backend
            var sPath = "/OrderHU(WarehouseNumber='" + this.iWN + "',HandlingUnitId='" + this.iHU + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                error: function(oError, resp) {
                    tools.handleODataRequestFailed(oError, resp, true);
                },
				success: function(rData, response) {
                    // ---- Check for complete final booking
                    if (rData.SapMessageType === "E") {
                        tools.alertMe(rData.SapMessageText, "");
                        
                        that._resetAll();
                        that._setFocus("idInput_HU");

                        return;
                    } else if (rData.SapMessageType === "I") {
                        // ---- Coding in case of showing Business application Informations
                        tools.alertMe(rData.SapMessageText, "");
                    }

					if (rData !== null && rData !== undefined) {
                        if (rData !== "") {
                            that._setHuData(rData, sScanView, that.iHU);
                        } else {
                            var sErrMsg = that.getResourceBundle().getText("HandlingUnitErr", that.iHU);

                            tools.alertMe(sErrMsg, "");
                        }
                    }
				}
			});
        },

	    _setHuData: function (oData, sScanView, iHU) {
            // ---- Reset the Display Model
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);
   
            this._handleHuData(sScanView, iHU);
            this._setFocus("idInput_HU");
        },

	    _loadStorageBinData: function (sScanView, sMaterial) {
            this.sStorageBin = sMaterial;

            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sErrMsg = this.getResourceBundle().getText("StorageBinErr", this.sStorageBin);
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

            var oModel = this._getServiceUrl()[0];
                oModel.read("/StorageBin", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.SapMessageType === "E" && rData.StatusGoodsReceipt === true) {
                                tools.alertMe(rData.SapMessageText, "");
                            } else if (rData.SapMessageType === "E" && rData.StatusGoodsReceipt === false) {
                                // ---- Coding in case of showing Business application Errors
                                tools.showMessageError(rData.SapMessageText, "");
                            } else if (rData.SapMessageType === "I") {
                                // ---- Coding in case of showing Business application Informations
                                tools.showMessageError(rData.SapMessageText, "");
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];                                    
                                    
                                    if (data.StorageBinID === that.sStorageBin) {
                                        that._setStorageBinData(data, sScanView);
                                    }
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

		_setStorageBinData: function (oData, sScanView) {
            // ---- Set the Data for the Model and set the Model to the View
            if (sScanView === "Location") {
                this.oDisplayModel.setProperty("/Book2StorageBin", oData.StorageBinID);
                this.oDisplayModel.setProperty("/Book2StorageType", oData.StorageType);

                this.oScanModel.setProperty("/viewLoc", false);
                this.oScanModel.setProperty("/viewMode", "LocConf");
                this.oScanModel.setProperty("/viewLocConf", true);
                this.oScanModel.setProperty("/valueMaterialNo", "");
                
                // ---- Set Focus to default Input field
                this._setFocus("idInput_LocConf");
            } else if (sScanView === "LocConf") {
                this.oDisplayModel.setProperty("/Book2StorageBinVerify", oData.StorageBinID);
                this._handleLocConfData();
            }
        },

	    _setDisplayData: function (sScanView, iHU) {
            var oHuData = {};
            var that = this;

            // ---- Reset the Display Model
            this.oDisplayModel.setData({});

            var oData = [{
                "HandlingUnitId":      "8000092750",
                "NumberOfPackages":    "2",
                "OrderId":             "265",
                "Material":            "03.031.93.63.2",    
                "MaterialDescription": "SCHALTHUELSE_TS2    47/028/021,5",
                "Quantity":            "23",
                "UnitOfMeasurement":   "ST",
                "TransportOrder":      "909797",
                "ActualAmount":        "",
                "DestStorageLocation": "",
                "DestStorageLocConf":  "",
                "DestStorageType":     ""
            },
            {
                "HandlingUnitId":      "8000092741",
                "NumberOfPackages":    "2",
                "OrderId":             "265",
                "Material":            "03.031.93.63.2",    
                "MaterialDescription": "SCHALTHUELSE_TS2    47/028/021,5",
                "Quantity":            "24",
                "UnitOfMeasurement":   "ST",
                "TransportOrder":      "909797",
                "ActualAmount":        "",
                "DestStorageLocation": "",
                "DestStorageLocConf":  "",
                "DestStorageType":     ""
            }];

            for (let i = 0; i < oData.length; i++) {
                var data = oData[i];

                if (data.HandlingUnitId === iHU) {
                    oHuData = data;
                }                
            }

            this.oDisplayModel.setData(oHuData);

            // this.byId("idInput_HU").setValue("");
   
            this._handleHuData(sScanView, iHU);
            this._setFocus("idInput_HU");
        },

        // --------------------------------------------------------------------------------------------------------------------

		_handleHuData: function (sScanView, iHU) {
            var sErrMesg = this.getResourceBundle().getText("ErrorHuScan", iHU);
            var oData = this.oDisplayModel.getData();
            var id    = "idInput_HU";
 
            if (oData !== null && oData !== undefined && sScanView === "HU") {
                oData.HandlingUnitId = iHU;
            }

            if (this.iHU !== iHU && sScanView === "HU") {
                this.oScanModel.setProperty("/showErr", true);
                this.oScanModel.setProperty("/showErrText", sErrMesg);
                this.oScanModel.setProperty("/valueMaterialNo", "");
            } else {
                this.oScanModel.setProperty("/showErr", false);
                this.oScanModel.setProperty("/showErrText", "");
                this.oScanModel.setProperty("/valueMaterialNo", "");

                // ---- Get the Data for all not empty values
                if (iHU !== null && iHU !== undefined && iHU !== "") {
                    if (sScanView === "HU") {
                        this.oDisplayModel.setProperty("/HandlingUnitId", iHU);

                        this.oScanModel.setProperty("/viewMat", false);
                        this.oScanModel.setProperty("/viewMode", "Quantity");
                        this.oScanModel.setProperty("/viewQuantity", true);
        
                        id = "idInput_Quantity";
                    }
                }
            }

            // ---- Set Focus to main Input field
            this._setFocus(id);
		},

		_handleQuantityData: function () {
            var sErrMesg = this.getResourceBundle().getText("OnlySmallQuantities");

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");
            
            if (this.oScanModel.getProperty("/valueMaterialNo") !== "") {
                var iActualQuantity = parseInt(this.oScanModel.getProperty("/valueMaterialNo"), 10);
                var iQuantity       = parseInt(this.oDisplayModel.getProperty("/Quantity"), 10);

                if (iActualQuantity > iQuantity) {
                    tools.alertMe(sErrMesg);

                    this.oScanModel.setProperty("/valueMaterialNo", "");
               
                    // ---- Set Focus to default Input field
                    this._setFocus("idInput_Quantity");

                    return;
                }

                this.onQuantityScanOpen();
            } else {
                // this._getConfigurationProposal();
            }
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

            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewMode", "Location");
            this.oScanModel.setProperty("/viewLoc", true);
            this.oScanModel.setProperty("/valueMaterialNo", "");

            // ---- Set Focus to default Input field
            this._setFocus("idInput_Location");
        },

        _handleLocationData: function (sScanView) {
            var sStorageBin = this.oScanModel.getProperty("/valueMaterialNo");

            if (sStorageBin !== null && sStorageBin !== undefined && sStorageBin !== "") {
                this._loadStorageBinData(sScanView, sStorageBin);
            } else {
                // this.oScanModel.setProperty("/viewLoc", false);
                // this.oScanModel.setProperty("/viewMode", "LocConf");
                // this.oScanModel.setProperty("/viewLocConf", true);
                // this.oScanModel.setProperty("/valueMaterialNo", "");
                
                // ---- Set Focus to default Input field
                // this._setFocus("idInput_LocConf");
                var sErrMsg = this.getResourceBundle().getText("StorageBinErr", sStorageBin);

                tools.alertMe(sErrMsg);
            }
        },

        _handleLocConfirm: function (sScanView) {
            var sStorageBin = this.oScanModel.getProperty("/valueMaterialNo");

            if (sStorageBin !== null && sStorageBin !== undefined && sStorageBin !== "") {
                this._loadStorageBinData(sScanView, sStorageBin);
            } else {
                var sErrMsg = this.getResourceBundle().getText("StorageBinErr", sStorageBin);

                tools.alertMe(sErrMsg);
            }
        },

        _handleLocConfData: function () {
            var sErrMesg     = this.getResourceBundle().getText("ErrorBooking");
            var oDisplayData = this.oDisplayModel.getData();
            var check = false;
            var id    = "idInput_HU";

            if (oDisplayData.Book2StorageBin === oDisplayData.Book2StorageBinVerify) {
                check = true;
            }

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            if (check) {
                id = "idButtonBookStorage";

                this.oScanModel.setProperty("/viewMode", "HU");
                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/refresh", false);
                this.oScanModel.setProperty("/ok", false);
                this.oScanModel.setProperty("/valueMaterialNo", "");
            } else {
                id = "idInput_Location";

                this.oScanModel.setProperty("/viewMode", "Location");
                this.oScanModel.setProperty("/viewLoc", true);
                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/showErr", true);
                this.oScanModel.setProperty("/showErrText", sErrMesg);
                this.oScanModel.setProperty("/valueMaterialNo", "");
            }
    
            // ---- Set Focus to default Input field
            this.byId(id).focus();
            this._setFocus(id);
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

            // this._getConfigurationProposal();
        },

		onQuantityScanAfterClose: function () {
            this._setFocus("idInput_HU");
		},

		onQuantityScanSave: function () {
			if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.oDisplayModel.setProperty("/Quantity", this.oScanModel.getProperty("/valueMaterialNo"));            
            // this._getConfigurationProposal();
		},

        // --------------------------------------------------------------------------------------------------------------------

		onHU2ScanOpen: function () {
			var fragmentFile = _fragmentPath + "DialogHU2Scan";
			var oView = this.getView();
			var that = this;

            // ---- Starts the Bookung Dialog for Handling Units
			if (!this.getView().dialogHU2Scan) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogHU2Scan = oDialog;
					oView.dialogHU2Scan.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogHU2Scan.open();
				});
			} else {
                oView.dialogHU2Scan.open();
            }
 		},

        onHU2ScanClose: function () {
            if (this.getView().dialogHU2Scan) {
				this.getView().dialogHU2Scan.close();
			}

            this.oScanModel.setProperty("/viewMat2", false);
            this.oScanModel.setProperty("/viewMode", "HU");
            this.oScanModel.setProperty("/ok", true);
            this.oScanModel.setProperty("/valueMaterialNo", "");
		},

		onHU2ScanAfterClose: function () {
            this._setFocus("idInput_HU");
		},

		onHU2ScanSave: function () {
			if (this.getView().dialogHU2Scan) {
				this.getView().dialogHU2Scan.close();
			}

            this.oScanModel.setProperty("/viewMat1", true);
            this.oScanModel.setProperty("/viewMode", "HU");
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueMaterialNo", "");

            // ---- Set Focus to default Input field
            this._setFocus("idInput_HU");
		},


        // --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            var oScanModel = this.oScanModel;
            var sScanView  = oScanModel.getData().viewMode;

            this.sScanView = sScanView;

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueMaterialNo") !== null && oEvent.getParameter("valueMaterialNo") !== undefined) {
                    var sMatNumber  = oEvent.getParameter("valueMaterialNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oEvent.getParameter("valueMaterialNo").trim()

                        oScanModel.setProperty("/valueMaterialNo", sMatNumber);
                    }
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        oScanModel.setProperty("/valueMaterialNo", sScanNumber);
                    }

                    var oResult = {
                        "sView":     this.sScanView,
                        "material":  sMatNumber,
                        "scanValue": sScanNumber
                    };
                    
                    this.iScanModusAktiv = 2;

                    if (this.sScanView === "HU") {
                        this._loadHuData(this.sScanView, oResult.material);
                    } else if (this.sScanView === "Location") {
                        this._loadStorageBinData(this.sScanView, oResult.material);
                    } else if (this.sScanView === "LocConf") {
                        this._loadStorageBinData(this.sScanView, oResult.material);
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

        onNavToStorage: function (hu) {
            this.getRouter().navTo("store", { 
                "hu": hu
            }, true);
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
                var sScanView = that.oScanModel.getData().viewMode;

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();
                        var controlF1 = that.BookButton;

                        if (sScanView === "HU") {
                            that._onOkClicked();
                        } else if (sScanView === "Quantity") {
                            that._handleQuantityData();                           
                        } else if (sScanView === "Location") {
                            that._handleLocationData(sScanView);                           
                        } else if (sScanView === "LocConf") {
                            that._handleLocConfirm(sScanView);                           
                        }
                        					
						break;			                
                    case 113: // ---- F2 Key
                        evt.preventDefault();
    
                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk(sScanView);
                        }

                        break;			                
                    case 114: // ---- F3 Key
                        evt.preventDefault();
                        that.onNavBack();
						break;			                
                    case 115: // ---- F4 Key
                        evt.preventDefault();
						that.onPressRefresh();						
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

        _setFocus: function (id) {
            setTimeout(() => this.byId(id).focus({ preventScroll: true, focusVisible: true }));
        },

        _resetQuantity: function () {
            // ---- Reset the Quantity view
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewMode", "Location");
            this.oScanModel.setProperty("/viewLoc", false);
            this.oScanModel.setProperty("/feedback", true);
            this.oScanModel.setProperty("/valueMaterialNo", "");
            
            // ---- Set Focus to default Input field
            this._setFocus("idInput_HU");
        },

        _resetAll: function () {
            // ---- Reset the Main Model
            this.oDisplayModel.setData({});
            this.oProposalModel.setData({});

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "HU",
                "booking":         false,
                "feedback":        false,
                "refresh":         true,
                "ok":              false,
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
                "valueMaterialNo": ""
            };

            this.oScanModel.setData(oData);
            this.iScanModusAktiv = 0;
            this.sScanType  = "";
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});