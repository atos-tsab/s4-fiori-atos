/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Queue-based Processing of Warehouse tasks
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
	"z/qbasedwareproc/model/formatter",
	"z/qbasedwareproc/utils/tools",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/BusyIndicator",
	"sap/ui/core/mvc/Controller"
], function (formatter, tools, ResourceModel, JSONModel, History, BusyIndicator, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.qbasedwareproc.";
    var _fragmentPath   = "z.qbasedwareproc.view.fragments.";
	var _sAppModulePath = "z/qbasedwareproc/";

    var APP = "QBAS_PROC_WARE";
 
 
    return Controller.extend("z.qbasedwareproc.controller.QbasedProcWare", {
 
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

            this.sWN    = "";
            this.bMDE   = false;
            this.bState = true;
            this.sActiveQMode   = "H";
            this.iActiveQueue   = 0;
            this.sActiveQueue   = "";
            this.sShellSource   = "#Shell-home";
            this.bExternalQueue = false;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the UI Tables
            this.QueueListTable    = this.byId("idTableQueueList");
            this.ShipmentListTable = this.byId("idTableShipmentList");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models. CaptureQueue
            var sCaptionShipment = this.oResourceBundle.getText("CaptureOwnShipments");
            var sViewTitle       = this.oResourceBundle.getText("CaptureQueue");

            var oData = {
                "viewMode":        "Queue",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "switchState":     true,
                "switchStateShip": true,
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewQueue":       true,
                "viewLocation":    false,
                "viewShipment":    false,
                "viewCaption":     sViewTitle,
                "captionShipment": sCaptionShipment,
                "valueManuallyNo": ""
            };

			this.oScanModel = new JSONModel(oData);
            
            this.getView().setModel(this.oScanModel, "ScanModel");
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
            if (this.byId("idTableQueueList")) {
				this.byId("idTableQueueList").destroy();
			}
            if (this.byId("idTableShipmentList")) {
				this.byId("idTableShipmentList").destroy();
			}

            // --------------------------------------------------------------

            if (this.byId("idTableQueueListMDE")) {
				this.byId("idTableQueueListMDE").destroy();
			}
            if (this.byId("idTableShipmentListMDE")) {
				this.byId("idTableShipmentListMDE").destroy();
			}
        },

        _onObjectMatched: function (oEvent) {
            var sViewTitleH = this.oResourceBundle.getText("CaptureQueue");
            var sViewTitleW = this.oResourceBundle.getText("CaptureShipping");

			// this._setKeyboardShortcutsQueue();

            // ---- Get the default Page ID
            this._getShellSource();
            
            // ---- Set start constellation
            this._resetAll();

            // ---- Check for MDE device
            this._handleMDE();

			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                if (oEvent.getParameter("arguments").qmode !== null && oEvent.getParameter("arguments").qmode !== undefined) {
                    this.sActiveQMode = oEvent.getParameter("arguments").qmode;
                } else {
                    this.sActiveQMode = "H";
                }
            } else {
                this.sActiveQMode = "H";
            }

            if (this.sActiveQMode === "H") {
                this.oScanModel.setProperty("/switchState", true);
                this.oScanModel.setProperty("/viewCaption", sViewTitleH);
                this.oScanModel.setProperty("/viewShipment", false);

                this.bExternalQueue = false;
            } else {
                this.oScanModel.setProperty("/switchState", false);
                this.oScanModel.setProperty("/switchStateShip", true);
                this.oScanModel.setProperty("/viewCaption", sViewTitleW);

                this.bExternalQueue = true;

                if (this.bMDE) {
                    this.oScanModel.setProperty("/viewShipment", false);
                } else {
                    this.oScanModel.setProperty("/viewShipment", true);
                    
                    if (!this.bState) {
                        this.oScanModel.setProperty("/switchStateShip", false);
                    }

                    this.loadShipmentData(this.bState);
                }
            }

            this.loadUserData();
        },

        _handleInputFields: function () {
            // ---- Check for MDE device
            this.bMDE = tools.getScreenResolution(this.getModel("device"), "phone");

            if (this.bMDE) {
                this.QueueListTable    = this.byId("idTableQueueListMDE");
                this.ShipmentListTable = this.byId("idTableShipmentListMDE");
            } else {
                this.QueueListTable    = this.byId("idTableQueueList");
                this.ShipmentListTable = this.byId("idTableShipmentList");
            }
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

        onPressMainOk: function (sViewMode) {
            this.onNavToHandlingUnits(this.sActiveQueue);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

        onPressShipment: function (iShipmentNumber) {
            this.saveShipmentData(iShipmentNumber);
        },

        // --------------------------------------------------------------------------------------------------------------------
        
        onSwitchChange: function (oEvent) {
            var sViewTitleH   = this.oResourceBundle.getText("CaptureQueue");
            var sViewTitleW   = this.oResourceBundle.getText("CaptureShipping");
            var sViewTitleOwn = this.oResourceBundle.getText("CaptureOwnShipments");

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameters() !== null && oEvent.getParameters() !== undefined) {
                    var bState = oEvent.getParameter("state");

                    if (bState) {
                        this.sActiveQMode   = "H";
                        this.bExternalQueue = false;

                        this.oScanModel.setProperty("/switchState", true);
                        this.oScanModel.setProperty("/viewShipment", false);
                        this.oScanModel.setProperty("/switchStateShip", true);
                        this.oScanModel.setProperty("/viewCaption", sViewTitleH);
                    } else {
                        this.sActiveQMode   = "W";
                        this.bExternalQueue = true;

                        this.oScanModel.setProperty("/switchState", false);
                        this.oScanModel.setProperty("/viewShipment", true);
                        this.oScanModel.setProperty("/switchStateShip", true);
                        this.oScanModel.setProperty("/viewCaption", sViewTitleW);
                        this.oScanModel.setProperty("/captionShipment", sViewTitleOwn);

                        if (this.bMDE) {
                            this.oScanModel.setProperty("/viewShipment", false);
                        } else {
                            // ---- Load Shipment data for All Users first
                            this.loadShipmentData(true);
                        }
                    }

                    this.loadQueueData();
                }
            }
        },

        onSwitchChangeShipment: function (oEvent) {
            var sViewTitleOwn = this.oResourceBundle.getText("CaptureOwnShipments");
            var sViewTitleAll = this.oResourceBundle.getText("CaptureAllShipments");

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameters() !== null && oEvent.getParameters() !== undefined) {
                    var bState = oEvent.getParameter("state");
 
                    // ---- Set the new value for the Shipment State (Shows own or all Shipments)
                    this.bState = bState;
 
                    if (bState) {
                        this.oScanModel.setProperty("/switchStateShip", true);
                        this.oScanModel.setProperty("/captionShipment", sViewTitleOwn);
                    } else {
                        this.oScanModel.setProperty("/switchStateShip", false);
                        this.oScanModel.setProperty("/captionShipment", sViewTitleAll);
                    }

                    this.loadShipmentData(this.bState);
                }
            }
        },

        // --------------------------------------------------------------------------------------------------------------------

        onHandleQueue: function (oEvent, navTo) {
            var oData = this.oScanModel.getData();
            var oTable = this.QueueListTable;
            var oModel = oTable.getModel();

            this.HandleEvent   = oEvent;
            this.HandleQueueId = oEvent.getSource().sId;

            if (oTable !== null && oTable !== undefined) {
                var iIndex = oTable.getSelectedIndex();
                var iEnd   = oModel.getData().length;

                if (navTo === "next") {
                    iIndex = iIndex + 1;
                } else {
                    iIndex = iIndex - 1;
                }

                if (iIndex === 0) {
                    oData.next = true;
                    oData.back = false;
                } else if (iIndex > 0 && iIndex < (iEnd - 1)) {
                    oData.next = true;
                    oData.back = true;
                } else if (iIndex < iEnd) {
                    oData.next = false;
                    oData.back = true;
                }

                oTable.setSelectedIndex(iIndex);

                var path = path = oTable.getBinding("rows").getContexts()[iIndex].getPath();
                var selectedRow = oModel.getProperty(path);

                this.iActiveQueue = iIndex;
                this.sActiveQueue = selectedRow.QueueId;
            }

            this.oScanModel.setData(oData);
        },

        onHandleQueueMDE: function (oEvent, navTo) {
            var oData = this.oScanModel.getData();
            var oTable = this.QueueListTable;
            var oModel = oTable.getModel();

            this.HandleEvent   = oEvent;
            this.HandleQueueId = oEvent.getSource().sId;

            if (oTable !== null && oTable !== undefined) {
                var iIndex = oTable.indexOfItem(oTable.getSelectedItem());
                var iEnd   = oModel.getData().length;

                if (navTo === "next") {
                    iIndex = iIndex + 1;
                } else {
                    iIndex = iIndex - 1;
                }

                if (iIndex === 0) {
                    oData.next = true;
                    oData.back = false;
                } else if (iIndex > 0 && iIndex < (iEnd - 1)) {
                    oData.next = true;
                    oData.back = true;
                } else if (iIndex < iEnd) {
                    oData.next = false;
                    oData.back = true;
                }

                oTable.setSelectedItem(oTable.getItems()[iIndex]);

                var path = oTable.getBinding("items").getContexts()[iIndex].getPath();
                var selectedRow = oModel.getProperty(path);

                this.iActiveQueue = iIndex;
                this.sActiveQueue = selectedRow.QueueId;
            }

            this.oScanModel.setData(oData);
        },

        // --------------------------------------------------------------------------------------------------------------------

        onRowSelectionQueueList: function (oEvent) {
            var oData  = this.oScanModel.getData();
            var oTable = this.QueueListTable;
            var oModel = oTable.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined && oTable.getBinding("rows").getContexts().length > 0) {
                        var path = "";

                        if (oEvent.getParameter("rowContext") !== null && oEvent.getParameter("rowContext") !== undefined) {
                            path = oEvent.getParameter("rowContext").getPath();
                        } else {
                            path = oTable.getBinding("rows").getContexts()[0].getPath();
                        }
                       
                        var selectedRow = sSource.getModel().getProperty(path);
                        var iIndex = sSource.getSelectedIndex();
                        var iEnd   = oModel.getData().length;

                        this.iActiveQueue = iIndex;
                        this.sActiveQueue = selectedRow.QueueId;

                        if (iIndex === 0) {
                            if (iEnd > 1) {
                                oData.next = true;
                            } else {
                                oData.next = false;
                            }

                            oData.back = false;
                        } else if (iIndex > 0 && iIndex < (iEnd - 1)) {
                            oData.next = true;
                            oData.back = true;
                        } else if (iIndex < iEnd) {
                            oData.next = false;
                            oData.back = true;
                        }                                       
                    }
                }
            }

            this.oScanModel.setData(oData);
        },

        onRowSelectionQueueListMDE: function (oEvent) {
            var oData  = this.oScanModel.getData();
            var oTable = this.QueueListTable;
            var oModel = oTable.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined && oTable.getBinding("items").getContexts().length > 0) {
                        var path = "";

                        if (oEvent.getParameter("listItem") !== null && oEvent.getParameter("listItem") !== undefined) {
                            path = oEvent.getParameter("listItem").getBindingContext().getPath();
                        } else {
                            path = oTable.getBinding("items").getContexts()[0].getPath();
                        }
                       
                        var selectedRow = sSource.getModel().getProperty(path);
                        var iIndex = sSource.indexOfItem(sSource.getSelectedItem());
                        var iEnd   = oModel.getData().length;

                        this.iActiveQueue = iIndex;
                        this.sActiveQueue = selectedRow.QueueId;

                        if (iIndex === 0) {
                            if (iEnd > 1) {
                                oData.next = true;
                            } else {
                                oData.next = false;
                            }

                            oData.back = false;
                        } else if (iIndex > 0 && iIndex < (iEnd - 1)) {
                            oData.next = true;
                            oData.back = true;
                        } else if (iIndex < iEnd) {
                            oData.next = false;
                            oData.back = true;
                        }                                       
                    }
                }
            }

            this.oScanModel.setData(oData);
        },

        onRowSelectionShipmentList: function (oEvent) {
            var oData  = this.oScanModel.getData();
            var oTable = this.ShipmentListTable;

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined && oTable.getBinding("rows").getContexts().length > 0) {
                        var path = "";

                        if (oEvent.getParameter("rowContext") !== null && oEvent.getParameter("rowContext") !== undefined) {
                            path = oEvent.getParameter("rowContext").getPath();
                        } else {
                            path = oTable.getBinding("rows").getContexts()[0].getPath();
                        }
                       
                        var selectedRow = sSource.getModel().getProperty(path);
                        var iIndex = sSource.getSelectedIndex();
                    }
                }
            }

            this.oScanModel.setData(oData);
        },

        onRowSelectionShipmentListMDE: function (oEvent) {
            var oData  = this.oScanModel.getData();
            var oTable = this.ShipmentListTable;

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined && oTable.getBinding("rows").getContexts().length > 0) {
                        var path = "";

                        if (oEvent.getParameter("listItem") !== null && oEvent.getParameter("listItem") !== undefined) {
                            path = oEvent.getParameter("listItem").getBindingContext().getPath();
                        } else {
                            path = oTable.getBinding("items").getContexts()[0].getPath();
                        }
                       
                        var selectedRow = sSource.getModel().getProperty(path);
                        var iIndex = sSource.indexOfItem(sSource.getSelectedItem());
                    }
                }
            }

            this.oScanModel.setData(oData);
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        saveShipmentData: function (iShipmentNumber) {
            var sErrMesg = this.oResourceBundle.getText("ErrorShipment", iShipmentNumber);
            var sOkMesg  = this.oResourceBundle.getText("OkMesBooking", iShipmentNumber);
            var tSTime   = this.oResourceBundle.getText("ShowTime");
            var that = this;

            if (iShipmentNumber !== null && iShipmentNumber !== undefined && iShipmentNumber !== "") {
                BusyIndicator.show(1);

                var sPath = "/Shipment(ShipmentNumber='" + iShipmentNumber + "')";
                var urlParam = { "BookGIAllDeliveries": true};
    
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
                                    // ---- Coding in case of showing Business application Errors
                                    tools.alertMe(rData.SapMessageText, "");
                                    
                                    that._resetAll();

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

                                that.loadShipmentData(that.bState);

                                setTimeout(function () {
                                    that._resetAll();                                
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
                        if (rData !== null && rData !== undefined) {
                            // ---- Check for complete final booking
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

                            // ---- Get the Page ID
                            that._getShellSource();

                            // ---- Load the Queue data
                            that.loadQueueData();
                        }
                    }
                });
        },

	    loadQueueData: function () {
            var sWarehouseNumberErr = this.oResourceBundle.getText("WarehouseNumberErr");
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
                aFilters.push(new sap.ui.model.Filter("NoOfOpenTasks", sap.ui.model.FilterOperator.GT, 0));
                aFilters.push(new sap.ui.model.Filter("ExternalQueue", sap.ui.model.FilterOperator.EQ, this.bExternalQueue));

            var sPath = "/Queue";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            that._setQueueTableData(rData.results);
                        }

                        BusyIndicator.hide();
                    }
                });
        },

        _setQueueTableData: function (oData) {
            var sErrMsg = this.oResourceBundle.getText("QueueErr");
            var that = this;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var item = oData[i];
                        item.No     = (i + 1);
                        item.Status = "None";
                        item.Booked =  false;
                } 
            } else {
                tools.alertMeOffset(sErrMsg, "0 -110");
            }

            var oModel = new JSONModel();
                oModel.setData(oData);
                
            this.QueueListTable.setModel(oModel);

            if (this.bMDE) {
                this.QueueListTable.bindItems({
                    path: "/",
                    template: that.QueueListTable.removeItem(0),
                    templateShareable: true
                });

                this.QueueListTable.setSelectedItem(this.QueueListTable.getItems()[0], true /*selected*/, true /*fire event*/);
            } else {
                this.QueueListTable.bindRows("/");
                this.QueueListTable.setSelectedIndex(0);
            }
        },

	    loadShipmentData: function (bState) {
            var that = this;

            // ---- Read the Shipment Data from the backend
			var aFilters = [];

            if (bState) {
                aFilters.push(new sap.ui.model.Filter("ShowQueuedOwn", sap.ui.model.FilterOperator.EQ, true)); // ---- Own
            } else {
                aFilters.push(new sap.ui.model.Filter("ShowQueuedAll", sap.ui.model.FilterOperator.EQ, true)); // ---- All
            }

            BusyIndicator.show(1);

            var sPath = "/Shipment";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            that._setShipmentTableData(rData.results);
                        }

                        BusyIndicator.hide();
                    }
                });
        },

        _setShipmentTableData: function (oData) {
            var sErrMsg = this.oResourceBundle.getText("ShipmentErr");
            var that = this;

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var item = oData[i];
                        item.No     = (i + 1);
                        item.Status = "Success";
                        item.Booked =  true;
                } 
            } else {
                tools.alertMeOffset(sErrMsg, "0 200");
            }

            var oModel = new JSONModel();
                oModel.setData(oData);

                this.ShipmentListTable.setModel(oModel);

            if (this.bMDE) {
                this.ShipmentListTable.bindItems({
                    path: "/",
                    template: that.ShipmentListTable.removeItem(0),
                    templateShareable: true
                });

                this.ShipmentListTable.setSelectedItem(this.ShipmentListTable.getItems()[0], true /*selected*/, true /*fire event*/);
            } else {
                this.ShipmentListTable.bindRows("/");
                this.ShipmentListTable.setSelectedIndex(0);
            }
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

        onNavToHandlingUnits: function (queue) {
            this.getRouter().navTo("hu", { "whn": this.sWN, "queue": queue, "qmode": this.sActiveQMode }, true);
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
		
		_setKeyboardShortcutsQueue: function() {
            var sRoute = "Main";
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                var sViewMode = that.oScanModel.getData().viewMode;

                // ---- Now call the actual event/method for the keyboard keypress
                if (evt.keyCode !== null && evt.keyCode !== undefined) {
                    switch (evt.keyCode) {
                        case 113: // ---- F2 Key
                            // evt.preventDefault();

                            // if (sRoute === "Main") {
                            //     that.onPressMainOk(sViewMode);
                            // }

                            break;			                
                        case 114: // ---- F3 Key
                            // evt.preventDefault();

                            // if (sRoute === "Main") {
                            //     that.onNavBack();
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

        _resetAll: function () {
            var oModel = new JSONModel([]);

            // ---- Reset the Scan Model
            var sCaptionShipment = this.oResourceBundle.getText("CaptureOwnShipments");
            var sViewTitle       = this.oResourceBundle.getText("CaptureQueue");

            var oData = { 
                "viewMode":        "Queue",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "switchState":     true,
                "switchStateShip": true,
                "showMain":        false,
                "showMDE":         false,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewQueue":       true,
                "viewLocation":    false,
                "viewShipment":    false,
                "viewCaption":     sViewTitle,
                "captionShipment": sCaptionShipment,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);

			// ---- Reset the UI Table for Queues
            if (this.QueueListTable !== null && this.QueueListTable !== undefined) {
                if (this.QueueListTable.getBusy()) {
                    this.QueueListTable.setBusy(!this.QueueListTable.getBusy());
                }

                this.QueueListTable.setModel(oModel);
            }

            // ---- Reset the UI Table for Shipments
            if (this.ShipmentListTable !== null && this.ShipmentListTable !== undefined) {
                if (this.ShipmentListTable.getBusy()) {
                    this.ShipmentListTable.setBusy(!this.ShipmentListTable.getBusy());
                }

                this.ShipmentListTable.setModel(oModel);
            }            
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});