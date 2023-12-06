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
	"z/qbasedwareproc/controls/ExtScanner",
	"z/qbasedwareproc/model/formatter",
	"z/qbasedwareproc/utils/tools",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
	"sap/ui/core/mvc/Controller"
], function (ExtScanner, formatter, tools, ResourceModel, JSONModel, BusyIndicator, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _sAppPath       = "z.qbasedwareproc.";
    var _fragmentPath   = "z.qbasedwareproc.view.fragments.";
	var _sAppModulePath = "z/qbasedwareproc/";

    var APP = "QBAS_PROC_WARE";
 
 
    return Controller.extend("z.qbasedwareproc.controller.HandlingUnits", {
 
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

            this.iActiveHU    = 0;
            this.sActiveHU    = "";
            this.sActiveQueue = "";
            this.sShellSource = "";
            this.sQueue = "";
            this.bMDE = false;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.LocationListTable = this.byId("idTableLocationList");

            // ---- Define the Input Fields
            this.idInputHU       = "";
            this.idInputMaterial = "";

            this.InputHU  = this.byId("idInput_HU");
            this.InputMat = this.byId("idInput_Material");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");
            var sViewTitleH   = this.oResourceBundle.getText("CaptureHU");
            var sTableTitleH  = this.oResourceBundle.getText("HU");
            var sColon        = this.oResourceBundle.getText("Colon");

            var oData = {
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "captionList":     sViewTitleInt + sColon + " - " + sViewTitleH,
                "captionTable":    sTableTitleH,
                "lblWidth":        "110px",
                "showMain":        false,
                "showMDE":         false,
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
            this.getRouter().getRoute("hu").attachPatternMatched(this._onObjectMatched, this);
        },

        // --------------------------------------------------------------------------------------------------------------------

        onBeforeRendering: function () {        
        },

        onAfterRendering: function () {
            this._handleInputFields();
        },

        onExit: function () {
            if (this.byId("idTableLocationList")) { this.byId("idTableLocationList").destroy(); }

            // --------------------------------------------------------------

            if (this.byId("idInput_HU"))       { this.byId("idInput_HU").destroy();       }
            if (this.byId("idInput_Material")) { this.byId("idInput_Material").destroy(); }

            // --------------------------------------------------------------

            if (this.byId("idInputMDE_HU"))       { this.byId("idInputMDE_HU").destroy();       }
            if (this.byId("idInputMDE_Material")) { this.byId("idInputMDE_Material").destroy(); }
        },

        _onObjectMatched: function (oEvent) {
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");
            var sViewTitleExt = this.oResourceBundle.getText("CaptureExternal");
            var sViewTitleH   = this.oResourceBundle.getText("CaptureHU");
            var sViewTitleM   = this.oResourceBundle.getText("CaptureMat");
            var sTableTitleH  = this.oResourceBundle.getText("HU");
            var sTableTitleM  = this.oResourceBundle.getText("Material");
            var sColon        = this.oResourceBundle.getText("Colon");
            
            this.sViewMode = this.oScanModel.getProperty("/viewMode");

			// ---- Enable the Function key solution
			// this._setKeyboardShortcutsHU();

            // ---- Reset all components 
            this._resetAll();
			
            // ---- Check for MDE device
            this._handleMDE();

			if (oEvent.getParameter("arguments") !== null && oEvent.getParameter("arguments") !== undefined) {
                this.sActiveQueue = oEvent.getParameter("arguments").queue;
                this.iWN          = oEvent.getParameter("arguments").whn;
                this.sActiveQMode = oEvent.getParameter("arguments").qmode;

                if (this.sActiveQMode === "H") {
                    this.oScanModel.setProperty("/captionList", sViewTitleInt + sColon + " - " + sViewTitleH);
                    this.oScanModel.setProperty("/captionTable", sTableTitleH);
                    this.oScanModel.setProperty("/captionVisble", true);
                    this.oScanModel.setProperty("/lblWidth", "110px");
                    this.oScanModel.setProperty("/viewMat", false);
                } else {
                    this.oScanModel.setProperty("/captionList", sViewTitleExt + sColon + " - " + sViewTitleM);
                    this.oScanModel.setProperty("/captionTable", sTableTitleM);
                    this.oScanModel.setProperty("/captionVisble", false);
                    this.oScanModel.setProperty("/lblWidth", "80px");
                    this.oScanModel.setProperty("/viewMat", true);
                }

                this.loadHuData(this.iWN, this.sActiveQueue);
            }

            // ---- Set Focus to main Input field
            this._handleFocus();
        },

        _handleInputFields: function () {
            // ---- Check for MDE device
            this.bMDE = tools.getScreenResolution(this.getModel("device"), "phone");

            if (this.bMDE) {
                this.idInputHU       = "idInputMDE_HU";
                this.idInputMaterial = "idInputMDE_Material";
     
                this.InputHU  = this.byId("idInputMDE_HU");
                this.InputMat = this.byId("idInputMDE_Material");

                this.LocationListTable = this.byId("idTableLocationListMDE");
            } else {
                this.idInputHU       = "idInput_HU";
                this.idInputMaterial = "idInput_Material";

                this.LocationListTable = this.byId("idTableLocationList");
            }

            this.InputHU.onsapenter  = ((oEvent) => { this._onOkClicked(); });
            this.InputMat.onsapenter = ((oEvent) => { this._onOkClicked(); });
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

        onPressHuOk: function () {
            this.onNavToResign(this.sActiveHU);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

        // --------------------------------------------------------------------------------------------------------------------

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

                var path = path = oTable.getBinding("rows").getContexts()[iIndex].getPath();
                var selectedRow = oModel.getProperty(path);

                this.iActiveQueue = iIndex;
                this.sActiveQueue = selectedRow.QueueId;
            }

            this.oScanModel.setData(oData);
        },

        onHandleLocationMDE: function (oEvent, navTo) {
            var oData = this.oScanModel.getData();
            var oTable = this.LocationListTable;
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

        onRowSelectionLocationList: function (oEvent) {
            var oData = this.oScanModel.getData();
            var oTable = this.LocationListTable;
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

                        var selectedRow= sSource.getModel().getProperty(path);
                        var iIndex = sSource.getSelectedIndex();
                        var iEnd   = oModel.getData().length;

                        this.iActiveHU = iIndex;

                        if (this.sActiveQMode === "H") {
                            this.sActiveHU = selectedRow.HandlingUnitId;
                        } else {
                            this.sActiveHU = selectedRow.WarehouseTaskId;
                        }

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

        onRowSelectionLocationListMDE: function (oEvent) {
            var oData = this.oScanModel.getData();
            var oTable = this.LocationListTable;
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

                        this.iActiveHU = iIndex;

                        if (this.sActiveQMode === "H") {
                            this.sActiveHU = selectedRow.HandlingUnitId;
                        } else {
                            this.sActiveHU = selectedRow.WarehouseTaskId;
                        }

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


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadHuData: function (iWHN, sQueue) {
            var sErrMsg = this.oResourceBundle.getText("QueueErr");
            var sNavTo  = "to_HandlingUnits,to_WarehouseTasks";
            var that = this;

            // ---- Read the HU Data from the backend 
            BusyIndicator.show(1);

            var id = "idInput_HU";

            if (this.sActiveQMode === "H") { 
                id = "idInput_HU";
            } else if (this.sActiveQMode === "W") {
                id = "idInput_Material";                       
            }

			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, iWHN));
                aFilters.push(new sap.ui.model.Filter("QueueId", sap.ui.model.FilterOperator.EQ, sQueue));
            
                if (this.sActiveQMode === "W") {
                    aFilters.push(new sap.ui.model.Filter("ReadMode", sap.ui.model.FilterOperator.EQ, this.sActiveQMode));
                }

            var sPath = "/Queue";

            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    filters: aFilters,
                    error: function(oError, resp) {
                        BusyIndicator.hide();

                        that.oScanModel.setProperty("/valueManuallyNo", "");

                        tools.handleODataRequestFailedTitle(oError, sQueue, true);
                    },
                    urlParameters: {
                        "$expand": sNavTo
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    var component = that.byId(id);

                                    if (component !== null && component !== undefined) {
                                        tools.showMessageErrorFocus(rData.results[0].SapMessageText, "", component);
                                    } else {
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    }
    
                                    that.oScanModel.setProperty("/valueManuallyNo", "");
    
                                    BusyIndicator.hide();
    
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    BusyIndicator.hide();

                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) { 
                                BusyIndicator.hide();

                                if (that.sActiveQMode === "H") {
                                    that._setHuTableData(rData.results[0].to_WarehouseTasks);
                                } else {
                                    that._setWhtTableData(rData.results[0].to_WarehouseTasks);
                                }
                            } else {
                                BusyIndicator.hide();

                                // ---- Coding in case of showing Business application Errors
                                var component = that.byId(id);

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

        _setHuTableData: function (oData) {
            var oSortTextArray = tools.splitStringIntoArray(this.oResourceBundle.getText("QueueSortProperty"), ",");
            var oListData = [];
            var that = this;
           
            for (let i = 0; i < oData.results.length; i++) {
                var item = oData.results[i];
                var data = {};
                    data.No     = (i + 1);
                    data.Status = "None";
                    data.Booked = false;

                    data.WarehouseTaskId       = item.WarehouseTaskId;
                    data.HandlingUnitId        = item.HandlingUnitId;
                    data.Material              = item.MaterialNo;
                    data.SourceStorageLocation = item.SourceStorageBin;
                    data.SourceStorageType     = item.SourceStorageType;
                    data.DestinationStorageBin = item.DestinationStorageBin;

                oListData.push(data);
            }

            var oModel = new JSONModel();
                oModel.setData(oListData);

            this.LocationListTable.setModel(oModel);

            // ---- Special sorting in case of Queue REPL / REPL2
            var sSortText = "";

            for (let j = 0; j < oSortTextArray.length; j++) {
                var item = oSortTextArray[j];
                
                if (item === this.sActiveQueue) {
                    sSortText = item;

                    break;
                }
            }

            if (this.bMDE) {
                this.LocationListTable.bindItems({
                    path: "/",
                    template: that.LocationListTable.removeItem(0),
                    templateShareable: true
                });

                if (this.sActiveQueue === sSortText) {
                    var oSorter = new sap.ui.model.Sorter("SourceStorageLocation", false);

                    this.LocationListTable.getBinding("items").sort(oSorter);
                }
 
                this.LocationListTable.setSelectedItem(this.LocationListTable.getItems()[0], true /*selected*/, true /*fire event*/);
            } else {
                this.LocationListTable.bindRows("/");

                // ---- Special sorting in case of Queue REPL
                if (this.sActiveQueue === sSortText) {
                    var oSorter = new sap.ui.model.Sorter("SourceStorageLocation", false);

                    this.LocationListTable.getBinding("rows").sort(oSorter);
                }
 
                this.LocationListTable.setSelectedIndex(0);
            }
        },

        _setWhtTableData: function (oData) {
            var oListData = [];
            var that = this;

            for (let i = 0; i < oData.results.length; i++) {
                var item = oData.results[i];
                var data = {};
                    data.No     = (i + 1);
                    data.Status = "None";
                    data.Booked = false;

                    data.WarehouseTaskId       = item.WarehouseTaskId;
                    data.Material              = item.MaterialNo;
                    data.SourceStorageLocation = item.SourceStorageBin;
                    data.SourceStorageType     = item.SourceStorageType;
                    data.DestinationStorageBin = item.DestinationStorageBin;

                oListData.push(data);
            } 

            var oModel = new JSONModel();
                oModel.setData(oListData);

            this.LocationListTable.setModel(oModel);

            if (this.bMDE) {
                this.LocationListTable.bindItems({
                    path: "/",
                    template: that.LocationListTable.removeItem(0),
                    templateShareable: true
                });

                this.LocationListTable.setSelectedItem(this.LocationListTable.getItems()[0], true /*selected*/, true /*fire event*/);
            } else {
                this.LocationListTable.bindRows("/");
                this.LocationListTable.setSelectedIndex(0);
            }
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
                        this.oScanModel.setProperty("/viewMat", true);

                        if (item.Material === iHU) {
                            if (this.bMDE) {
                                oTable.setSelectedItem(oTable.getItems()[0], true /*selected*/, true /*fire event*/);
                            } else {
                                oTable.setSelectedIndex(0);
                            }

                            break;
                        }
                    } else {
                        if (item.HandlingUnitId === iHU) {
                            if (this.bMDE) {
                                oTable.setSelectedItem(oTable.getItems()[0], true /*selected*/, true /*fire event*/);
                            } else {
                                oTable.setSelectedIndex(0);
                            }
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
                // if (evt.keyCode !== null && evt.keyCode !== undefined) {
                //     switch (evt.keyCode) {
                //         case 13: // ---- Enter Key
                //             evt.preventDefault();
    
                //             if (sRoute === "HU") {
                //                 if (this.sActiveQMode === "H") {
                //                     that.onPressHuOk(sViewMode);
                //                 } else {
                //                     that._onOkClicked();
                //                 }
                //             }
    
                //             evt.keyCode = null;
                            
                //             break;			                
                //         case 113: // ---- F2 Key
                //             evt.preventDefault();
    
                //             if (sRoute === "HU") {
                //                 that.onPressHuOk(sViewMode);
                //             }
    
                //             break;			                
                //         case 114: // ---- F3 Key
                //             evt.preventDefault();
    
                //             if (sRoute === "HU") {
                //                 that.onNavBack();
                //             }
    
                //             that.onNavBack();
                //             break;			                
                //         case 115: // ---- F4 Key
                //             evt.preventDefault();
    
                //             if (sRoute === "HU") {
                //                 that.onPressRefresh();
                //             }
    
                //             break;			                
                //         default: 
                //             // ---- For other SHORTCUT cases: refer link - https://css-tricks.com/snippets/javascript/javascript-keycodes/   
                //             break;
                //     }
                // }
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

            if (this.sActiveQMode === "H") { 
                id = "idInput_HU";
            } else if (this.sActiveQMode === "W") {
                id = "idInput_Material";                       
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
            var sViewTitleInt = this.oResourceBundle.getText("CaptureInternal");
            var sViewTitleH   = this.oResourceBundle.getText("CaptureHU");
            var sTableTitleH  = this.oResourceBundle.getText("HU");
            var sColon        = this.oResourceBundle.getText("Colon");

            var oData = { 
                "viewMode":        "Handling",
                "booking":         false,
                "refresh":         false,
                "ok":              true,
                "next":            true,
                "back":            false,
                "captionList":     sViewTitleInt + sColon + " - " + sViewTitleH,
                "captionTable":    sTableTitleH,
                "lblWidth":        "110px",
                "showMain":        false,
                "showMDE":         false,
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

            // ---- Set Focus to main Input field
            this._setFocus("idInput_HU");
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});