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
 
 
    return BaseController.extend("z.qbasedwareproc.controller.HandlingUnits", {
 
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

            this.iActiveHU    = 0;
            this.sActiveHU    = "";
            this.sActiveQueue = "";
            this.sShellSource = "";
            this.sQueue = "";

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.LocationListTable = this.byId("idTableLocationList");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var sViewTitleH = this.getResourceBundle().getText("CaptureHU");
            var sTableTitleH = this.getResourceBundle().getText("HU");

            var oData = {
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "captionList":     sViewTitleH,
                "captionTable":    sTableTitleH,
                "lblWidth":        "110px",
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewHu":          false,
                "viewMat":         false,
                "valueManuallyNo": ""
            };

			this.oScanModel = new JSONModel(oData);

            this.getView().setModel(this.oScanModel, "ScanModel");
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
            this.getRouter().getRoute("hu").attachPatternMatched(this._onObjectMatched, this);
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

            if (this.byId("idTableLocationList")) {
				this.byId("idTableLocationList").destroy();
			}
        },

        _onObjectMatched: function (oEvent) {
            var sViewTitleH  = this.getResourceBundle().getText("CaptureHU");
            var sViewTitleM  = this.getResourceBundle().getText("CaptureMat");
            var sTableTitleH = this.getResourceBundle().getText("HU");
            var sTableTitleM = this.getResourceBundle().getText("Material");
            var sTableTitleC = this.getResourceBundle().getText("WarehouseTask");

			// ---- Enable the Function key solution
			this._setKeyboardShortcutsHU();

            // ---- Reset all components 
            this._resetAll();
            this._setFocus();
			
			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                this.sActiveQueue = oEvent.getParameter("arguments").queue;
                this.iWN          = oEvent.getParameter("arguments").whn;
                this.sActiveQMode = oEvent.getParameter("arguments").qmode;

                if (this.sActiveQMode === "H") {
                    this.oScanModel.setProperty("/captionList", sViewTitleH);
                    this.oScanModel.setProperty("/captionTable", sTableTitleH);
                    this.oScanModel.setProperty("/captionColumn", sTableTitleH);
                    this.oScanModel.setProperty("/lblWidth", "110px");
                    this.oScanModel.setProperty("/viewMat", false);
                } else {
                    this.oScanModel.setProperty("/captionList", sViewTitleM);
                    this.oScanModel.setProperty("/captionTable", sTableTitleM);
                    this.oScanModel.setProperty("/captionColumn", sTableTitleC);
                    this.oScanModel.setProperty("/lblWidth", "80px");
                    this.oScanModel.setProperty("/viewMat", true);
                }

                this.loadHuData(this.iWN, this.sActiveQueue);
            }
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressHuOk: function () {
            this.onNavToResign(this.sActiveHU);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

        onRowSelectionLocationList: function (oEvent) {
            var oData = this.oScanModel.getData();
            var oTable = this.LocationListTable;
            var oModel = oTable.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var sSource = oEvent.getSource();

                    if (oTable !== null && oTable !== undefined) {
                        var path = oEvent.getParameter("rowContext").getPath();
                        var selectedRow= sSource.getModel().getProperty(path);

                        var iIndex = sSource.getSelectedIndex();
                        var iEnd   = oModel.getData().length;

                        this.iActiveHU = iIndex;
                        this.sActiveHU = selectedRow.HandlingUnitId;

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

        onHandleLocation: function (oEvent, navTo) {
            var oData = this.oScanModel.getData();
            var oTable = this.LocationListTable;
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


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadHuData: function (iWHN, sQueue) {
            var sErrMsg = this.getResourceBundle().getText("QueueErr");
            var sNavTo  = "to_HandlingUnits";
            var that = this;

            // ---- Read the HU Data from the backend 
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, iWHN));
                aFilters.push(new sap.ui.model.Filter("QueueId", sap.ui.model.FilterOperator.EQ, sQueue));
            
                if (this.sActiveQMode === "W") {
                    aFilters.push(new sap.ui.model.Filter("ReadMode", sap.ui.model.FilterOperator.EQ, this.sActiveQMode));

                    sNavTo = "to_WarehouseTasks";
                }

            this.getView().setBusy(true);

            var oModel = this._getServiceUrl()[0];
                oModel.read("/Queue", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        that.getView().setBusy(false);

                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    urlParameters: {
                        "$expand": sNavTo
                    },
                    success: function(rData, response) {
                        that.getView().setBusy(false);

                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) { 
                                if (that.sActiveQMode === "H") {
                                    that._setHuTableData(rData.results[0].to_HandlingUnits);
                                } else {
                                    that._setWhtTableData(rData.results[0].to_WarehouseTasks);
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

        _setHuTableData: function (oData) {
            var oListData = [];
           
            for (let i = 0; i < oData.results.length; i++) {
                var item = oData.results[i];
                var data = {};
                    data.No     = (i + 1);
                    data.Status = "None";
                    data.Booked = false;

                    data.HandlingUnitId        = item.HandlingUnitId;
                    data.Material              = item.Material;
                    data.SourceStorageLocation = item.StorageBin;
                    data.SourceStorageType     = item.StorageType;

                oListData.push(data);
            } 

            var oModel = new JSONModel();
                oModel.setData(oListData);

            this.LocationListTable.setModel(oModel);
            this.LocationListTable.bindRows("/");
            this.LocationListTable.setSelectedIndex(0);
        },

        _setWhtTableData: function (oData) {
            var oListData = [];

            for (let i = 0; i < oData.results.length; i++) {
                var item = oData.results[i];
                var data = {};
                    data.No     = (i + 1);
                    data.Status = "None";
                    data.Booked = false;

                    data.HandlingUnitId        = item.WarehouseTaskId;
                    data.Material              = item.MaterialNo;
                    data.SourceStorageLocation = item.SourceStorageBin;
                    data.SourceStorageType     = item.SourceStorageType;

                oListData.push(data);
            } 

            var oModel = new JSONModel();
                oModel.setData(oListData);

            this.LocationListTable.setModel(oModel);
            this.LocationListTable.bindRows("/");
            this.LocationListTable.setSelectedIndex(0);
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sManNumber = oScanData.valueManuallyNo;
                    
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oScanData.valueManuallyNo.trim();

                        oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this._rowSelectionLocationList(sManNumber);
                }    
            }
		},

        _rowSelectionLocationList: function (sManNumber) {
            var oTable = this.LocationListTable;
            var oModel = oTable.getModel();
            var iHU    = sManNumber;

            if (oModel !== null && oModel !== undefined) {
                var oTableData = oModel.getData();

                for (let i = 0; i < oTableData.length; i++) {
                    let item = oTableData[i];
                    
                    if (this.sActiveQMode === "W") {
                        if (item.Material === iHU) {
                            oTable.setSelectedIndex(i);
                        }

                        this.oScanModel.setProperty("/viewMat", true);
                    } else {
                        if (item.HandlingUnitId === iHU) {
                            oTable.setSelectedIndex(i);
                        }
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
                    }

                    this._rowSelectionLocationList(oScanModel.getProperty("/valueManuallyNo"));
                }    
            }
 		},

        onScanHu: function (sViewMode) {
            this.sViewMode = sViewMode;

			this.oScanner.openScanDialog("HU", sViewMode);
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
            this.getRouter().navTo("main", {"qmode": this.sActiveQMode}, true);
        },

        onNavToResign: function (hu) {
            this.getRouter().navTo("resign", { 
                "whn":   this.iWN,
                "queue": this.sActiveQueue,
                "qmode": this.sActiveQMode,
                "hu":    hu
            }, true);
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
		
		_setKeyboardShortcutsHU: function() {
            var sRoute = "HU";
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                var sViewMode = that.oScanModel.getData().viewMode;

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (sRoute === "HU") {
                            if (this.sActiveQMode === "H") {
                                that.onPressHuOk(sViewMode);
                            } else {
                                that._onOkClicked();
                            }
                        }
                        
						break;			                
                    case 113: // ---- F2 Key
                        evt.preventDefault();

                        if (sRoute === "HU") {
                            that.onPressHuOk(sViewMode);
                        }

						break;			                
                    case 114: // ---- F3 Key
                        evt.preventDefault();

                        if (sRoute === "HU") {
                            that.onNavBack();
                        }

                        that.onNavBack();
						break;			                
                    case 115: // ---- F4 Key
                        evt.preventDefault();

                        if (sRoute === "HU") {
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

        _setFocus: function () {
            setTimeout(() => this.byId("idInput_HU").focus());
        },

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
            var sViewTitleH  = this.getResourceBundle().getText("CaptureHU");
            var sTableTitleH = this.getResourceBundle().getText("HU");

            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "captionList":     sViewTitleH,
                "captionTable":    sTableTitleH,
                "lblWidth":        "110px",
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewHu":          false,
                "viewMat":         false,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);

			// ---- Reset the UI Table A
            if (this.LocationListTable !== null && this.LocationListTable !== undefined) {
                if (this.LocationListTable.getBusy()) {
                    this.LocationListTable.setBusy(!this.LocationListTable.getBusy());
                }

                this.LocationListTable.setModel(oModel);
            }
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});