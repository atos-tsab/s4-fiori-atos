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
    "z/qbasedwareproc/controller/BaseController",
	"z/qbasedwareproc/model/formatter",
	"z/qbasedwareproc/utils/tools",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, formatter, tools, JSONModel, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath   = "z.qbasedwareproc.view.fragments.";
	var _sAppModulePath = "z/qbasedwareproc/";
    var APP = "QBAS_PROC_WARE";
 
 
    return BaseController.extend("z.qbasedwareproc.controller.QbasedProcWare", {
 
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

            this.sActiveQMode   = "H";
            this.iActiveQueue   = 0;
            this.sActiveQueue   = "";
            this.sShellSource   = "#Shell-home";
            this.bExternalQueue = false;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.QueueListTable = this.byId("idTableQueueList");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models. CaptureQueue
            var sViewTitle = this.getResourceBundle().getText("CaptureQueue");

            var oData = {
                "viewMode":        "Queue",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "switchState":     true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewQueue":       true,
                "viewLocation":    false,
                "viewCaption":     sViewTitle,
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
        },

        onExit: function () {
			if (this.byId("idButtonBook_" + APP)) {
				this.byId("idButtonBook_" + APP).destroy();
			}

            // --------------------------------------------------------------

            if (this.byId("idTableQueueList")) {
				this.byId("idTableQueueList").destroy();
			}
        },

        _onObjectMatched: function (oEvent) {
            var sViewTitleH = this.getResourceBundle().getText("CaptureQueue");
            var sViewTitleW = this.getResourceBundle().getText("CaptureShipping");

			// ---- Enable the Function key solution
			this._setKeyboardShortcutsMain();

            this._getShellSource();
            this._resetAll();

			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                if (oEvent.getParameter("arguments").qmode !== null && oEvent.getParameter("arguments").qmode !== undefined) {
                    this.sActiveQMode = oEvent.getParameter("arguments").qmode;    
                }
            }

            if (this.sActiveQMode === "H") {
                this.oScanModel.setProperty("/switchState", true);
                this.oScanModel.setProperty("/viewCaption", sViewTitleH);
            } else {
                this.oScanModel.setProperty("/switchState", false);
                this.oScanModel.setProperty("/viewCaption", sViewTitleW);
            }

            this.loadUserData();
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressMainOk: function (sViewMode, route) {
            this.sViewMode = sViewMode;

            this.onNavToHandlingUnits(this.sActiveQueue);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

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
            }

            this.oScanModel.setData(oData);
        },

        onRowSelectionQueueList: function (oEvent) {
            var oData  = this.oScanModel.getData();
            var oTable = this.QueueListTable;
            var oModel = oTable.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined && oTable.getBinding("rows").getContexts().length > 0) {
                        var path = oEvent.getParameter("rowContext").getPath();
                        var selectedRow= sSource.getModel().getProperty(path);

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

        onSwitchChange: function (oEvent) {
            var sViewTitleH = this.getResourceBundle().getText("CaptureQueue");
            var sViewTitleW = this.getResourceBundle().getText("CaptureShipping");

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameters() !== null && oEvent.getParameters() !== undefined) {
                    var bState = oEvent.getParameter("state");
 
                    if (bState) {
                        this.sActiveQMode   = "H";
                        this.bExternalQueue = false;
                        this.oScanModel.setProperty("/switchState", true);
                        this.oScanModel.setProperty("/viewCaption", sViewTitleH);
                    } else {
                        this.sActiveQMode   = "W";
                        this.bExternalQueue = true;
                        this.oScanModel.setProperty("/switchState", false);
                        this.oScanModel.setProperty("/viewCaption", sViewTitleW);
                     }

                    this.loadQueueData();
                }
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadUserData: function () {
            var sParam = encodeURIComponent("/SCWM/LGN");
            var that   = this;

            this.iWN = "";

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
                        that.iWN = rData.ParameterValue;

                        that.loadQueueData();
                    }
				}
			});
        },

	    loadQueueData: function () {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var that = this;

            // ---- Check for Warehouse Number
            if (this.iWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.iWN));
                aFilters.push(new sap.ui.model.Filter("NoOfOpenTasks", sap.ui.model.FilterOperator.GT, 0));
                aFilters.push(new sap.ui.model.Filter("ExternalQueue", sap.ui.model.FilterOperator.EQ, this.bExternalQueue));

            this.getView().setBusy(true);

            var oModel = this._getServiceUrl()[0];
                oModel.read("/Queue", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        that.getView().setBusy(false);

                        if (rData.results !== null && rData.results !== undefined) {
                            that._setQueueTableData(rData.results);
                        }
                    }
                });
        },

        _setQueueTableData: function (oData) {
            var sErrMsg = this.getResourceBundle().getText("QueueErr");

            if (oData.length > 0) {
                for (let i = 0; i < oData.length; i++) {
                    var item = oData[i];
                        item.No     = (i + 1);
                        item.Status = "None";
                        item.Booked =  false;
                } 
            } else {
                tools.alertMe(sErrMsg, "");
            }

            var oModel = new JSONModel();
                oModel.setData(oData);

            this.QueueListTable.setModel(oModel);
            this.QueueListTable.bindRows("/");
            this.QueueListTable.setSelectedIndex(0);
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
            this.getRouter().navTo("hu", { "whn": this.iWN, "queue": queue, "qmode": this.sActiveQMode }, true);
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
		
		_setKeyboardShortcutsMain: function() {
            var sRoute = "Main";
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                var sViewMode = that.oScanModel.getData().viewMode;

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
                    case 113: // ---- F2 Key
                        evt.preventDefault();

                        if (sRoute === "Main") {
                            that.onPressMainOk(sViewMode);
                        }

						break;			                
                    case 114: // ---- F3 Key
                        evt.preventDefault();

                        if (sRoute === "Main") {
                            that.onNavBack();
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

        _resetAll: function () {
            var oModel = new JSONModel([]);

            // ---- Reset the Main Model
            var oDisplayData = {
                "ExtLsPackage":     "",
                "SupplierId":       "",
                "Supplier":         "",
                "ExtShipment":      "",
                "Delivery":         "",
                "Scanmodus":        "",
                "PsDeliverNote":    ""
            };

            var oDisplayModel = new JSONModel();
                oDisplayModel.setData(oDisplayData);

            this.getView().setModel(oDisplayModel, "DisplayModel");

            // ---- Reset the Scan Model
            var sViewTitle = this.getResourceBundle().getText("CaptureQueue");

            var oData = { 
                "viewMode":        "Queue",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "switchState":     true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewQueue":       true,
                "viewLocation":    false,
                "viewCaption":     sViewTitle,
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
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});