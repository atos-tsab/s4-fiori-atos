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
    "z/qbasedwareproc/controller/BaseController",
	"z/qbasedwareproc/controls/ExtScanner",
	"z/qbasedwareproc/model/formatter",
	"z/qbasedwareproc/utils/tools",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Sorter",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, Sorter, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath   = "z.qbasedwareproc.view.fragments.";
	var _sAppModulePath = "z/qbasedwareproc/";
    var APP = "QBAS_PROC_WARE";
 
 
    return BaseController.extend("z.qbasedwareproc.controller.Resign", {

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
            // ---- Define variables for the License View
            this.oView = this.getView();

            this.iWN = "";
            this.iHU = "";
            this.iBookCount      = 0;
            this.sScanType       = "";
            this.oDeliveryData   = {};
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
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewStorage":     false,
                "viewHu":          false,
                "viewMat":         true,
                "viewWHT":         false,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueSuffix":     "",
                "valueManuallyNo": ""
            };

			this.oScanModel    = new JSONModel(oData);
            this.oDisplayModel = new JSONModel();

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
            this.getRouter().getRoute("resign").attachPatternMatched(this._onObjectMatched, this);
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
			this._setKeyboardShortcutsResign();

            // ---- Reset all components
            this._resetAll();
            this.sSuffix = "";

			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                this.sActiveQueue = oEvent.getParameter("arguments").queue;
                this.iWN          = oEvent.getParameter("arguments").whn;
                this.sActiveQMode = oEvent.getParameter("arguments").qmode;
                this.iHU          = oEvent.getParameter("arguments").hu;
                
                // ---- Change the Main focus to HU or Warehouse Task
                // if (this.sActiveQMode === "W") {
                //     this.oScanModel.setProperty("/viewMode", "Handling");
                //     this.oScanModel.setProperty("/viewQuantity", false);
                //     this.oScanModel.setProperty("/viewHu", true);

                //     this._setFocus("idInput_WHT");
                // } else {
                //     this.oScanModel.setProperty("/viewMode", "Quantity");
                //     this.oScanModel.setProperty("/viewQuantity", true);
                //     this.oScanModel.setProperty("/viewHu", false);

                //     this._setFocus("idInput_Quantity");
                // }

                this._loadWareHouseData(this.iWN, this.sActiveQueue, this.iHU);
            }
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            this.saveBookingData();
        },

        onPressResignOk: function (sViewMode) { 
            if (sViewMode !== null && sViewMode !== undefined && sViewMode !== "") {
                this.sViewMode = sViewMode;
            } else {
                this.sViewMode = this.oScanModel.getProperty("/viewMode");
            }
 
            // ---- Change the Scan Model
            this._onOkClicked();
        },

        onPressRefresh: function () {
            // ---- Reset all components
            this._resetAll();

            this._loadWareHouseData(this.iWN, this.sActiveQueue, this.iHU);
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sManNumber = oScanData.valueManuallyNo;
                    
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oScanData.valueManuallyNo.trim();
                        sManNumber = this._removePrefix(sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    if (this.sViewMode === "LocConf") {
                        this.iBookCount = 1;
                    } else if (this.sViewMode === "Location") {
                        this.iBookCount = 2;
                    }

                    this.iScanModusAktiv = 1;
                    this._showResignData(this.sViewMode, sManNumber);
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        saveBookingData: function (iDocumentNo) {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var oData    = this.oDisplayModel.getData();
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined && this.oDisplayModel.getData()) {

                var sPath = "/WarehouseTask(WarehouseNumber='" + oData.WarehouseNumber + "',WarehouseTaskId='" + oData.WarehouseTaskId + "')";
                var urlParam = { "WarehouseTaskType": "H", "BookConfirm": true };
    
                this.oModel.update(sPath, urlParam, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, oResponse) {
                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                            that.oScanModel.setProperty("/showOk", true);
                            that.oScanModel.setProperty("/showOkText", sOkMesg);       

                            setTimeout(function () {
                                that._resetAll();
                                that.onNavBack();
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
        // ---- Loading / Set Functions
        // --------------------------------------------------------------------------------------------------------------------

	    _loadWareHouseData: function (iWHN, sQueue, iHU) {
            var sErrMsg = this.getResourceBundle().getText("HandlingUnitErr", iHU);
            var that = this;

            // ---- Read the WareHouse Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, iWHN));
                aFilters.push(new sap.ui.model.Filter("QueueId", sap.ui.model.FilterOperator.EQ, sQueue));

            this.getView().setBusy(true);

            var oModel = this._getServiceUrl()[0];
                oModel.read("/Queue", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTasks"
                    },
                    success: function(rData, response) {
                        that.getView().setBusy(false);

                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results[0].to_WarehouseTasks.results.length > 0) {
                                let data = rData.results[0].to_WarehouseTasks.results;

                                for (let i = 0; i < data.length; i++) {
                                    let item = data[i];

                                    if (that.sActiveQMode === "H") {
                                        if (item.HandlingUnitId === iHU) {
                                            that._setWareHouseTableData(item);
                                        }
                                    } else if (that.sActiveQMode === "W") {
                                        if (item.WarehouseTaskId === iHU) {
                                            that._setWareHouseTableData(item);
                                        }
                                    }
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

	    _setWareHouseTableData: function (oData, sManNumber) {
            var sViewMode = this.oScanModel.getProperty("/viewMode");

            // ---- Reset the Display Model
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData);

            this.iScanModusAktiv = 0;

                // ---- Change the Main focus to HU or Warehouse Task
                if (this.sActiveQMode === "W") {
                    this.oScanModel.setProperty("/viewMode", "Handling");
                    // this.oScanModel.setProperty("/viewQuantity", false);
                    // this.oScanModel.setProperty("/viewHu", true);

                    // this._setFocus("idInput_WHT");
                } else {
                    this.oScanModel.setProperty("/viewMode", "Quantity");
                    // this.oScanModel.setProperty("/viewQuantity", true);
                    // this.oScanModel.setProperty("/viewHu", false);

                    // this._setFocus("idInput_Quantity");
                }

            this._changeScanModel(sViewMode, sManNumber);

            // this._setFocus("idInput_HU");
        },

		_showResignData: function (sViewMode, sManNumber) {
            // ---- Reset the Error Headlines
            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            // if (sViewMode === "Handling") {
            //     if (this.sActiveQMode === "H") {
            //         this._setFocus("idInput_Quantity");
            //     } else {
            //         this._setFocus("idInput_HU");
            //     }

            //     this._loadQuantityData(sManNumber);
            // } else if (sViewMode === "Quantity") {
            //     this._loadLocConfData(sManNumber);
            // } else if (sViewMode === "LocConf") {
            //     if (sManNumber !== "") {
            //         this._handleFinalData(sManNumber);
            //     }
            // }

            this._changeScanModel(sViewMode, sManNumber);
            this.oScanModel.setProperty("/valueManuallyNo", "");
		},

        _changeScanModel: function(sViewMode, sManNumber) {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking");
            var id    = "idInput_HU";
            var check = false;
            var that  = this;

            // ---- Change the Scan Model
            var oData = {
                "viewMode":     "",
                "booking":      false,
                "refresh":      true,
                "ok":           true,
                "showOk":       false,
                "showErr":      false,
                "showOkText":   "",
                "showErrText":  "",
                "viewStorage":  false,
                "viewHu":       false,
                "viewMat":      false,
                "viewWHT":      false,
                "viewQuantity": false,
                "viewLocConf":  false,
                "viewLoc":      false,
                "valueSuffix":  this.sSuffix
            };

            // ---- Change the Main focus to HU or Warehouse Task
            if (this.sActiveQMode === "W") {
                // oData.viewMode = "WarehouseTask";
                // oData.viewWHT  = true;

                id = "idInput_WHT";
            } else {
                // oData.viewMode     = "Handling";
                // oData.viewQuantity = true;
                // oData.viewMat      = true;

                id = "idInput_Quantity";
            }

            if (sViewMode === "LocConf" && sManNumber !== "") {
                check = this._checkDestStorageLocation(sManNumber);
            }

            switch (sViewMode) {
                case "Handling":
                    id = "idInput_Quantity";
                    oData.viewMode     = "Quantity";
                    oData.viewQuantity = true;

                    break;
                case "WarehouseTask":
                    id = "idInput_WHT";
                    oData.viewMode = "WarehouseTask";
                    oData.viewWHT  = true;

                    break;
                case "Quantity":
                    id = "idInput_LocConf";
                    oData.viewMode     = "LocConf";
                    oData.viewQuantity = false;
                    oData.viewLocConf  = true;

                    break;
                case "Location":
                    id = "idInput_LocConf";
                    oData.viewMode     = "LocConf";
                    oData.viewLocation = false;
                    oData.viewQuantity = false;
                    oData.viewLocConf  = true;
                    // oData.refresh      = false;

                    break;
                case "LocConf":
                    if (check) {
                        id = "idButtonBookHU";
                        oData.viewQuantity = false;
                        oData.booking      = true;
                        oData.refresh      = false;
                        oData.ok           = false;
                    } else {
                        id = "idInput_Location";
                        // oData.viewQuantity = false;
                        // oData.viewMode     = "Location";
                        // oData.viewLoc      = true;
                        // oData.showErr      = true;
                        // oData.showErrText  = sErrMesg;
                    }

                    break;
                default:
                    break;
            }

            this.oScanModel.setData(oData);

            this.byId(id).focus();

            setTimeout(function () {
                that.byId(id).focus();
            }, 300);            
        },

        // --------------------------------------------------------------------------------------------------------------------

        _handleHandlingUnitData: function (sViewMode, sManNumber) {
            this._setFocus("idInput_HU");

            this.oScanModel.setProperty("/viewMode", "Handling");
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewHu", true);
        },

        _loadQuantityData: function (sViewMode, sManNumber) {
            this._setFocus("idInput_Quantity");

            this.oScanModel.setProperty("/viewMode", "Quantity");
            this.oScanModel.setProperty("/viewQuantity", true);
            this.oScanModel.setProperty("/viewHu", false);

            return;
        },

        _loadLocConfData: function (sManNumber) {
            this._setFocus("idInput_LocConf");

            this.oScanModel.setProperty("/viewMode", "LocConf");
            this.oScanModel.setProperty("/viewLocConf", true);
            this.oScanModel.setProperty("/viewQuantity", false);

            if (sManNumber !== "") {
                this.oDisplayModel.setProperty("/ActualQuantity", sManNumber);
            } else {
                this.oDisplayModel.setProperty("/ActualQuantity", this.oDisplayModel.getProperty("/TargetQuantity"));
            }

            return;
        },

        _handleFinalData: function (sManNumber) {
            var sErrMesg  = this.getResourceBundle().getText("StorageBinErr", sManNumber);
            var tSTime    = this.getResourceBundle().getText("ShowTime");
            var check = false;
            var id    = "idInput_Location";
            var that  = this

            check = this._checkDestStorageLocation(sManNumber);

            this.oScanModel.setProperty("/viewMode", "LocConf");

            if (check) {
                id = "idButtonBookHU";

                this.oScanModel.setProperty("/viewLocConf", false);
                this.oScanModel.setProperty("/booking", true);
                this.oScanModel.setProperty("/refresh", false);
                this.oScanModel.setProperty("/ok", false);
            } else {
                id = "idInput_Location";

                this.oScanModel.setProperty("/viewLocConf", true);
                this.oScanModel.setProperty("/booking", false);
                this.oScanModel.setProperty("/refresh", true);

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

        // --------------------------------------------------------------------------------------------------------------------

		_handleResignData: function (sViewMode, sManNumber) {
            // var sErrMesg  = this.getResourceBundle().getText("ErrorHuScan", sManNumber);
            // var tSTime    = this.getResourceBundle().getText("ShowTime");
            // var iHU   = sManNumber;
            // var check = false;
            // var id    = "";
            // var that  = this

            // if (this.iHU !== iHU && sViewMode === "Handling") {
            //     this.oScanModel.setProperty("/showErr", true);
            //     this.oScanModel.setProperty("/showErrText", sErrMesg);

            //     this.byId("idInput_HU").setValue("");
                
            //     id = "idInput_HU";
            // } else if (this.iHU !== iHU && sViewMode === "WarehouseTask") {
            //     this.oScanModel.setProperty("/showErr", true);
            //     this.oScanModel.setProperty("/showErrText", sErrMesg);

            //     this.byId("idInput_WHT").setValue("");

            //     id = "idInput_WHT";
            // } else {
            //     this.oScanModel.setProperty("/showErr", false);
            //     this.oScanModel.setProperty("/showErrText", "");

            //     // ---- Get the Data for all not empty values
            //     if (iHU !== null && iHU !== undefined && iHU !== "") {
            //         if (sViewMode === "Handling") {
            //             id = "idInput_HU";

            //             this.oDisplayModel.setProperty("/HandlingUnitId", iHU);
            //         } else if (sViewMode === "WarehouseTask") {
            //             id = "idInput_WHT";

            //             this.oDisplayModel.setProperty("/WarehouseTaskId", iHU);
            //         } else if (sViewMode === "Quantity") {
            //             id = "idInput_Quantity";

            //             this.oDisplayModel.setProperty("/ActualQuantity", sManNumber);
            //         } else if (sViewMode === "Location") {
            //             id = "idInput_Location";

            //             this.oDisplayModel.setProperty("/DestinationStorageBin", sManNumber);
            //         } else if (sViewMode === "LocConf") {
            //             id = "idInput_LocConf";

            //             this.oDisplayModel.setProperty("/DestinationStorageBin", sManNumber);
            //         }
            //     } else {
            //         if (sViewMode === "Handling") {
            //             id = "idInput_HU";
            //         } else if (sViewMode === "WarehouseTask") {
            //             id = "idInput_WHT";
            //         } else if (sViewMode === "Quantity") {
            //             id = "idInput_Quantity";

            //             this.oDisplayModel.setProperty("/ActualQuantity", this.oDisplayModel.getProperty("/TargetQuantity"));
            //         } else if (sViewMode === "Location") {
            //             id = "idInput_Location";
            //         } else if (sViewMode === "LocConf") {
            //             id = "idInput_LocConf";
            //         }
            //     }

            //     // ---- Change the Scan Model
            //     this._changeScanModel(sViewMode, sManNumber);

            //     check = true;                
            // }

            // this.oScanModel.setProperty("/valueManuallyNo", "");
            // // this.byId(id).focus();

            // if (!check) {
            //     setTimeout(function () {
            //         that.oScanModel.setProperty("/showErr", false);
            //         that.oScanModel.setProperty("/showErrText", "");
    
            //         // ---- Set Focus to main Input field
            //         that._setFocus(id);
            //     }, tSTime);            
            // }         
		},

		_oldchangeScanModel: function(sViewMode, sManNumber) {
            // var sErrMesg = this.getResourceBundle().getText("ErrorBooking");
            // var id    = "idInput_HU";
            // var check = false;
            // var that  = this;

            // // ---- Change the Scan Model
            // var oData = {
            //     "viewMode":     "",
            //     "booking":      false,
            //     "refresh":      true,
            //     "ok":           true,
            //     "showOk":       false,
            //     "showErr":      false,
            //     "showOkText":   "",
            //     "showErrText":  "",
            //     "viewStorage":  false,
            //     "viewHu":       false,
            //     "viewMat":      false,
            //     "viewWHT":      false,
            //     "viewQuantity": false,
            //     "viewLocConf":  false,
            //     "viewLoc":      false,
            //     "valueSuffix":  this.sSuffix
            // };

            // // ---- Change the Main focus to HU or Warehouse Task
            // if (this.sActiveQMode === "W") {
            //     oData.viewMode = "WarehouseTask";
            //     oData.viewWHT  = true;

            //     id = "idInput_WHT";
            // } else {
            //     oData.viewMode     = "Quantity";
            //     oData.viewQuantity = true;
            //     oData.viewMat      = true;

            //     id = "idInput_Quantity";
            // }

            // if (sViewMode === "LocConf") {
            //     check = this._checkDestStorageLocation(sManNumber);
            // }

            // switch (sViewMode) {
            //     case "Handling":
            //         id = "idInput_Quantity";
            //         oData.viewMode     = "Quantity";
            //         oData.viewQuantity = true;
            //         break;
            //     case "WarehouseTask":
            //         id = "idInput_Quantity";
            //         oData.viewMode     = "Quantity";
            //         oData.viewQuantity = true;
            //         break;
            //     case "Quantity":
            //         id = "idInput_LocConf";
            //         oData.viewMode     = "LocConf";
            //         oData.viewQuantity = false;
            //         oData.viewLocConf  = true;
            //         break;
            //     case "Location":
            //         id = "idInput_LocConf";
            //         oData.viewMode     = "LocConf";
            //         oData.viewQuantity = false;
            //         oData.viewLocConf  = false;
            //         oData.refresh      = false;
            //         break;
            //     case "LocConf":
            //         if (check) {
            //             id = "idButtonBookHU";
            //             oData.viewQuantity = false;
            //             oData.booking      = true;
            //             oData.refresh      = false;
            //             oData.ok           = false;
            //         } else {
            //             id = "idInput_Location";
            //             oData.viewQuantity = false;
            //             oData.viewMode     = "Location";
            //             oData.viewLoc      = true;
            //             oData.showErr      = true;
            //             oData.showErrText  = sErrMesg;
            //         }
            //         break;
            //     default:
            //         break;
            // }

            // this.oScanModel.setData(oData);

            // this.byId(id).focus();

            // setTimeout(function () {
            //     that.byId(id).focus();
            // }, 300);            
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


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Table Functions
        // --------------------------------------------------------------------------------------------------------------------

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
    
            var oDisplayModel = this.getView().getModel("DisplayModel");
                oDisplayModel.setProperty("/PSDeliveryNote", sNote + " / " + oData.length);
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

            this._setFocus("idInput_HU");
		},

		onBookApprovalAfterClose: function () {
            this._setFocus("idInput_HU");
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
            this._setFocus("idInput_HU");
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
                        sManNumber = oEvent.getParameter("valueManuallyNo").trim()

                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                    }
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                    }

                    if (this.sViewMode === "LocConf") {
                        this.iBookCount = 1;
                    } else if (this.sViewMode === "Location") {
                        this.iBookCount = 2;
                    }

                    if (iScanAktiv !== null && iScanAktiv !== undefined && iScanAktiv !== "") {
                        this.iScanModusAktiv = iScanAktiv;
                    } else {
                        this.iScanModusAktiv = 2;
                    }

                    this._showResignData(this.sViewMode, this.oScanModel.getProperty("/valueManuallyNo"));
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
            this.getRouter().navTo("hu", { "whn": this.iWN, "queue": this.sActiveQueue, "qmode": this.sActiveQMode }, true);
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
		
		_setKeyboardShortcutsResign: function() {
            var sRoute = "Resign";
            var that  = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (sRoute === "Resign") {
                            if (that.iScanModusAktiv < 2) {
                                that.onPressResignOk(undefined);
                            } else {
                                that.iScanModusAktiv = 0;
                            }
                        }
                        
						break;			                
			        case 112: // ---- F1 Key
                        evt.preventDefault();
                        var controlF1 = that.BookButton;

                        if (sRoute === "Resign") {
                            if (controlF1 && controlF1.getEnabled()) {
                                that.onPressBooking();
                            }
                        }
						
						break;			                
                    case 113: // ---- F2 Key
                        evt.preventDefault();
 
                        if (sRoute === "Resign") {
                            if (that.iScanModusAktiv < 2) {
                                that.onPressResignOk(that.sViewMode);
                            } else {
                                that.iScanModusAktiv = 0;
                            }
                        }
                        
						break;			                
                    case 114: // ---- F3 Key
                        evt.preventDefault();

                        if (sRoute === "Resign") {
                            that.onNavBack();
                        }

                        break;			                
                    case 115: // ---- F4 Key
                        evt.preventDefault();

                        if (sRoute === "Resign") {
                            that.onPressRefresh();
                        }
                        
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
            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
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

        _resetAll: function () {
            // ---- Reset the Main Model
            this.oDisplayModel.setData({});

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewStorage":     false,
                "viewHu":          false,
                "viewMat":         true,
                "viewWHT":         false,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueSuffix":     "",
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);
                
            // ---- Change the Main focus to HU or Warehouse Task
            // if (this.sActiveQMode === "W") {
            //     this.oScanModel.setProperty("/viewMode", "Handling");
            //     this.oScanModel.setProperty("/viewQuantity", false);
            //     this.oScanModel.setProperty("/viewHu", true);

            //     this._setFocus("idInput_WHT");
            // } else {
            //     this.oScanModel.setProperty("/viewMode", "Quantity");
            //     this.oScanModel.setProperty("/viewQuantity", true);
            //     this.oScanModel.setProperty("/viewHu", false);

            //     this._setFocus("idInput_Quantity");
            // }

            this.sScanType  = "";
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});