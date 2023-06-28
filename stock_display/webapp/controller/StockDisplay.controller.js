/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Bestandsanzeige
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
    "z/stockdisplay/controller/BaseController",
	"z/stockdisplay/controls/ExtScanner",
	"z/stockdisplay/model/formatter",
	"z/stockdisplay/utils/tools",
	"sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath   = "z.stockdisplay.view.fragments.";
	var _sAppModulePath = "z/stockdisplay/";
    var APP = "STOC_DISP";
 
 
    return BaseController.extend("z.stockdisplay.controller.StockDisplay", {

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

            this.iWN  = "";
            this.iMat = "";
            this.sShellSource    = "#Shell-home";
            this.oDeliveryData   = {};
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.MaterialInfoTable = this.byId("idTableMaterialInfo");
        },

        _initLocalModels: function () {
            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":        "Material",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
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
            this._setFocus();
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressOk: function (sViewMode) {
            if (sViewMode !== null && sViewMode !== undefined && sViewMode !== "") {
                this.sViewMode = sViewMode;
            } else {
                this.sViewMode = this.oScanModel.getProperty("/viewMode");
            }

            // ---- Change the Scan Model
            this._onOkClicked(sViewMode);
        },

        onPressRefresh: function () {
            this._resetAll();
        },

		_onOkClicked: function (sViewMode) {
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

                    this.iScanModusAktiv = 1;
                    this.loadStockOverviewData(sManNumber);
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading / Set Functions
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
                    if (rData !== null && rData !== undefined) {
                        if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                            tools.showMessageError(rData.SapMessageText, "");
                        } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }
                    }

					if (rData !== null && rData !== undefined && rData !== "") {
                        that.iWN = rData.ParameterValue;
                    }
				}
			});
        },

	    loadStockOverviewData: function (sManNumber) {
            this.iMat = sManNumber;

            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sErrMsg = this.getResourceBundle().getText("MaterialErr", this.iMat);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.iWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNo", sap.ui.model.FilterOperator.EQ, this.iWN));
                aFilters.push(new sap.ui.model.Filter("MaterialNo", sap.ui.model.FilterOperator.EQ, this.iMat));

            var oModel = this._getServiceUrl()[0];
                oModel.read("/OverviewStock", {
                    filters: aFilters,
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        // ---- Check for complete final booking
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E") {
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }
                        }

                        // ---- Start with showing data
                        if (rData.results !== null && rData.results !== undefined) {
                            if (rData.results.length > 0) {
                                that._setStockOverviewData(rData);
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

        _setStockOverviewData: function (oData) {
            var oTable = this.MaterialInfoTable;
            
            // ---- Sum of all Quantities of one Material
            var iSum = 0;

            for (let i = 0; i < oData.results.length; i++) {
                let data = oData.results[i];
                
                iSum = iSum + parseInt(data.Quantity, 10);
            }

            // ---- Set the Display data to the View
            this.oDisplayModel.setProperty("/MaterialNo", oData.results[0].MaterialNo);
            this.oDisplayModel.setProperty("/MaterialDescription", oData.results[0].MaterialDescription);
            this.oDisplayModel.setProperty("/Quantity", iSum);
            this.oDisplayModel.setProperty("/Unit", oData.results[0].Unit);

            // ---- Set Model data to Table
            this._setTableModel(oData, oTable);

            // ---- Set focus to Input field
            this._setFocus();
        },

		_setTableModel: function (oData, oTable) {
            var tableTitle = this.getResourceBundle().getText("ResultTable", oData.results.length);

            oTable.setTitle(tableTitle);

            var oModel = new JSONModel();
                oModel.setData(oData.results);

            oTable.setModel(oModel);
            oTable.bindRows("/");
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
                        key = this._removePrefix(key);

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
            var oScanModel = this.oScanModel;
                oScanModel.setProperty("/valueManuallyNo", "");
                oScanModel.setProperty("/valueScan", "");

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    var iScanAktiv  = oEvent.getParameter("iScanModusAktiv");
                    
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
                        sManNumber = sScanNumber;
                    }

                    if (iScanAktiv !== null && iScanAktiv !== undefined && iScanAktiv !== "") {
                        this.iScanModusAktiv = iScanAktiv;
                    } else {
                        this.iScanModusAktiv = 2;
                    }

                    this.loadStockOverviewData(sManNumber);
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
                var sViewMode = that.oScanModel.getData().viewMode;
                var controlF2 = that.byId("idInput_Mat");

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk(sViewMode);
                        } else {
                            that.iScanModusAktiv = 0;
                        }

						break;			                
			        case 112: // ---- F1 Key
                        evt.preventDefault();
                        var controlF1 = that.BookButton;

				        if (controlF1 && controlF1.getEnabled()) {
                            that.onPressBooking();
                        }
						
						break;			                
                    case 113: // ---- F2 Key
                        evt.preventDefault();
 
                        if (that.iScanModusAktiv < 2) {
                            if (controlF2 && controlF2.getEnabled()) {
                                controlF2.fireChange();
                            }
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

        _setFocus: function () {
            var id ="idInput_Mat";
            var that = this;

            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
            } else if (this.byId(id) !== null && this.byId(id) !== undefined) {
                setTimeout(() => that.getView().byId(id).focus({ preventScroll: true, focusVisible: true }));
            }
        },

        _removePrefix: function (key) {
            let str = key;

            // ---- Check for P=Material Suffix | Q=Quantity Suffix || S=MaterialUnit Suffix
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
            this.oDisplayModel.setProperty("/MaterialNo", "");
            this.oDisplayModel.setProperty("/MaterialDescription", "");
            this.oDisplayModel.setProperty("/Quantity", "");
            this.oDisplayModel.setProperty("/Unit", "");

            // ---- Reset the Scan Model
            var oData = { 
                "viewMode":        "Material",
                "booking":         false,
                "refresh":         true,
                "ok":              true,
                "showOk":          false,
                "showErr":         false,
                "showOkText":      "",
                "showErrText":     "",
                "viewMat":         true,
                "valueManuallyNo": ""
            };

            this.oScanModel.setData(oData);

			// ---- Reset the UI Table A
            var oModel = new JSONModel([]);

            if (this.MaterialInfoTable !== null && this.MaterialInfoTable !== undefined) {
                if (this.MaterialInfoTable.getBusy()) {
                    this.MaterialInfoTable.setBusy(!this.MaterialInfoTable.getBusy());
                }

                this.MaterialInfoTable.setModel(oModel);
            }
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});