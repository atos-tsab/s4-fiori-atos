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
    "z/recweforeign/controller/BaseController",
	"z/recweforeign/controls/ExtScanner",
	"z/recweforeign/model/formatter",
	"z/recweforeign/utils/tools",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Sorter",
	"sap/ndc/BarcodeScanner",
    "sap/ui/core/routing/History",
	"sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, Sorter, BarcodeScanner, History, Controller) {

    "use strict";

 	// ---- The app namespace is to be define here!
    var _fragmentPath = "z.recweforeign.view.fragments.";
    var APP = "REC_WE_FORN";
 
 
    return BaseController.extend("z.recweforeign.controller.RecWeForeign", {

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

            this.sShellSource = "";

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Buttons
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define the UI Tables
            this.MaterialInfoTable = this.byId("idTableMaterialInfo");
            this.PackageListTable  = this.byId("idTablePackageList");

            // ---- Define Model data
            this.oDisplayData1 = {
                "HU":               "1000000366",
                "ExtLsPackage":     "31315046",
                "SupplierId":       "913130",
                "Supplier":         "MORAVSKE KOVARNY A",
                "ExtShipment":      "",
                "Delivery":         "18979387",
                "Scanmodus":        "A",
                "PsDeliverNote":    "1 / 1"
            };

            this.oDisplayData2 = {
                "HU":               "1000000368",
                "ExtLsPackage":     "21215046",
                "SupplierId":       "912130",
                "Supplier":         "MORAVSKE KOVARNY A",
                "ExtShipment":      "",
                "Delivery":         "18974587",
                "Scanmodus":        "B",
                "PsDeliverNote":    "0 / 16"
            };
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
                "valueMaterialNo": ""
            };

			this.oScanModel = new JSONModel(oData);

            this.getView().setModel(this.oScanModel, "ScanModel");

            // ---- Set Barcode Model.
			this.BarCodeModel = BarcodeScanner.getStatusModel();
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
            this._loadTableDataB();

            // ---- Set Focus to main Input field
            setTimeout(() => this.byId("idInput_Material").focus());

            // tools.alertMe(sap.ui.Device.resize.width);
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            var sOkMesg    = this.getResourceBundle().getText("OkMesBooking", "000909790");
            var tSTime     = this.getResourceBundle().getText("ShowTime");
            var oScanModel = this.oScanModel;
            var oScanData  = oScanModel.getData();
            var that = this

            // ---- ToDo: Check from Backend for not identically dest. Storage Location
            var check = true;

            if (check) {
                oScanData.showOk     = true;
                oScanData.showOkText = sOkMesg;
            } else {
                oScanData.showOk     = false;
                oScanData.showOkText = "";               
            }

            this.oScanModel.setData(oScanData);

            if (check) {
                setTimeout(function () {
                    that._resetAll();

                    // ---- Set Focus to main Input field
                    setTimeout(() => that.byId("idInput_Material").focus());
                }, tSTime);            
            }         
        },

        onPressOk: function (sScanView) {
            this.sScanView = sScanView;

            // ---- Change the Scan Model
            this._onOkClicked(sScanView);
        },

        onPressRefresh: function () {
            this._resetAll();
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Loading Functions
        // --------------------------------------------------------------------------------------------------------------------

	    loadHuData: function (hu, sScanView) {
            var oDisplayModel = new JSONModel();
            var oModel = this.oModel;
            var oData = {};
            hu = "1000000366";

            // ---- Read the HU Data from the backend

            
        },

		_loadScanData: function (mResult, sScanView) {
            var oDisplayModel = new JSONModel();
            var oData = {};

            // ---- Get the right Data for the new model
            if (mResult.material !== null && mResult.material !== undefined && mResult.material !== "" && sScanView === "Material") {
                this.MAT = mResult.material;
            }

            if (mResult.material !== null && mResult.material !== undefined) {
                if (this.MAT === "1000000366" || this.MAT === "31315046") {
                    oData = this.oDisplayData1;
                } else {
                    oData = this.oDisplayData2;
                }
            }

            // ---- Get the Data for all not empty values
            if (mResult.material !== null && mResult.material !== undefined && mResult.material !== "") {
                if (sScanView === "Material") {
                    oData.ExtLsPackage = mResult.material;
                } else {
                    oData.ExtLsPackage = "";
                }
            } else {
                oData.ExtLsPackage = "";
            }

            // ---- Set the Data for the Model and set the Model to the View
            oDisplayModel.setData(oData);

            this.getView().setModel(oDisplayModel, "DisplayModel");

            if (this.MAT === "1000000366" || this.MAT === "31315046") {
                this.byId("idScrollContainerTableA").setVisible(true);
                this.byId("idScrollContainerTableB").setVisible(false);

                this._setTableDataA(mResult.material);
            } else {
                this.byId("idScrollContainerTableA").setVisible(false);
                this.byId("idScrollContainerTableB").setVisible(true);

                this._setTableDataB(mResult.material);
            }
        },

		_changeScanModel: function(trigger) {
            var oData = this.oScanModel.getData();
            var id    = "";
            var that  = this;

            // ---- Change the Scan Model
            if (trigger) {
                id = "idButtonBook_REC_WE_FORN";
                oData.booking  = true;
                oData.refresh  = false;
                oData.ok       = false;

                setTimeout(function () {
                    that.byId(id).focus();
                }, 300);            
            } else {
                id = "idInput_Material";
                oData.booking  = false;
                oData.refresh  = true;
                oData.ok       = true;
            }

            this.oScanModel.setData(oData);
            this.byId(id).focus();
            this.byId(id).focus();
        },

        _setTableDataA: function (mResult) {
            var oData = this.oScanModel.getData();
            var id    = "";
            var that  = this;

            var oTableData = {
				results:[
                    { 
                        "Status":      "Success",
                        "Pos":         "10",
                        "Material":    "01.001.00.68.0",
                        "Description": "TRAVERSE_TS2",
                        "Amount":      "6.240",
                        "UOM":         "ST"
                    }
                ]
			};

            var oModel = new JSONModel();
                oModel.setData(oTableData.results);

            this.MaterialInfoTable.setModel(oModel);
            this.MaterialInfoTable.bindRows("/");

            if (this.MaterialInfoTable.getModel().getData().length > 0) {
                // ---- Change the Scan Model
                this._changeScanModel(true);
            } else {
                // ---- Change the Scan Model
                this._changeScanModel(false);
            }
        },

        _loadTableDataB: function () {
            var oData = {
				results:[
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215046",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215047",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215048",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215049",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215050",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215051",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215052",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215053",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215054",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215055",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215056",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215057",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215058",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215059",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215060",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    },
                    { 
                        "Status":      "None",
                        "Booked":      false,
                        "Package":     "21215061",
                        "Packaging":   "12.999.01.070",
                        "Material":    "01.001.00.68.0",
                        "Amount":      "6.240",
                        "UOM":         "ST",
                        "Description": "TRAVERSE_TS2"
                    }
                ]
			};
            
            var oModel = new JSONModel();
                oModel.setData(oData.results);

            this.PackageListTable.setModel(oModel);
            this.PackageListTable.bindRows("/");
        },

        _setTableDataB: function (mResult) {
            var oTable     = this.PackageListTable;
            var oModel     = oTable.getModel();
            var oTableData = oModel.getData();
            var iCnt = 0;
            var id   = "";
            var that = this;

            if (oTableData.length > 0) {
                for (let i = 0; i < oTableData.length; i++) {
                    if (oTableData[i].Package === mResult) {
                        oTableData[i].Booked = true;
                        oTableData[i].Status = "Success";
                    }

                    if (oTableData[i].Booked === true) {
                        iCnt = iCnt + 1;
                    }
                }
            }
    
            // ---- Sort Table data
            var oSorter = new Sorter({ path: "Booked", descending: false, group: true });
            
            oTable.getBinding("rows").sort(oSorter);

            // ---- Set and bind data
            oModel.setData(oTableData);
            oTable.setModel(oModel);
            
            // ---- Check the Scanning data
            var oDisplayModel = this.getView().getModel("DisplayModel");
            var oDisplayData  = oDisplayModel.getData();

            oDisplayData.PsDeliverNote = iCnt + " / " + oTableData.length;
 
            oDisplayModel.setData(oDisplayData);

            if (iCnt === oTableData.length) {
                // ---- Change the Scan Model
                this._changeScanModel(true);
            } else {
                // ---- Change the Scan Model
                this._changeScanModel(false);
            }
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sMatNumber = oScanData.valueMaterialNo;
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oScanData.valueMaterialNo.trim();
                    } else {
                        sMatNumber = "";
                    }

                    var oMaterialNo = {
                        "sView":     this.sScanView,
                        "material":  sMatNumber,
                        "scanValue": ""
                    };
                    
                    this._loadScanData(oMaterialNo, this.sScanView);
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Table Functions
        // --------------------------------------------------------------------------------------------------------------------

		_resetSortingState: function() {
            var oTable = this.PackageListTable;
			var aColumns = oTable.getColumns();

			for (var i = 0; i < aColumns.length; i++) {
				aColumns[i].setSorted(false);
			}
		},


		// --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueMaterialNo") !== null && oEvent.getParameter("valueMaterialNo") !== undefined) {
                    var sMatNumber  = oEvent.getParameter("valueMaterialNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oEvent.getParameter("valueMaterialNo").trim()
                    }
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                    }

                    var oMaterialNo = {
                        "sView":     this.sScanView,
                        "material":  sMatNumber,
                        "scanValue": sScanNumber
                    };
                    
                    this._loadScanData(oMaterialNo, this.sScanView);
                }    
            }
 		},

		onScan: function (sScanView) {
            this.sScanView = sScanView;

			this.oScanner.openScanDialog();
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
		// ---- QR/Bar Code Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanOld: function (oEvent) {
			var noBarCodeScanner = this.getResourceBundle().getText("NoBarCodeScanner");
			var scanPossible = this.BarCodeModel.getData().available;
			var that = this;

			if (scanPossible) {
				BarcodeScanner.scan(
					function (mResult) {
						var oScanned = { "Package": "" };

						if (mResult.cancelled) {
							return;
						}

                        that._loadScanData(mResult);
					},
					function (Error) {
						var errText = that.getResourceBundle().getText("ScanningFailed");

						tools.alertMe(errText + Error);
					},
					function (mParams) {
						var paramText = that.getResourceBundle().getText("EnterredValue");

						// tools.alertMe(paramText + mParams.newValue);
					},
					// ---- Hard coded Dialog Title for manual data entering
					"Manuelle Qr / Barcode Eingabe"

					// Fragment.load({
					//     id: this.oView.getId(),
					//     name: _fragmentPath + "EnterMaterialNumberDialog",
					//     controller: this
					// }).then(function (oDialog) {
					//     that._scanned = true;

					//     that.oView.addDependent(oDialog);
					//     that.oView._materialEnterMaterialDialog = oDialog;
					//     that.oView._materialEnterMaterialDialog.open();
					//     that.oView.byId("idEnterMaterialNumber").focus();
					// }.bind(this))
				);
			} else {
				tools.showMessageWarning(noBarCodeScanner, "");
			}
		},

		onAcceptEnterMaterialDialog: function () {
			var oValue = this.byId("idEnterMaterialNumber").getValue();

			// this._proceedWithMaterialDialog(oValue);
		},

		onCancelEnterMaterialDialog: function () {
			this.getView()._materialEnterMaterialDialog.close();
		},

		onAfterCloseEnterMaterialDialog: function () {
			this.getView()._materialEnterMaterialDialog.destroy();
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Navigation Functions
        // --------------------------------------------------------------------------------------------------------------------

        onNavBack: function () {
            if (sap.ushell !== null && sap.ushell !== undefined) {
                if (sap.ushell.Container !== null && sap.ushell.Container !== undefined) {
                    var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                        oCrossAppNavigator.toExternal({
                            target: {
                                shellHash: this.sShellSource
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
                        that.onPressOk(sScanView);
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
                        that.onPressOk(sScanView);
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
                "valueMaterialNo": ""
            };

            this.oScanModel.setData(oData);

            // ---- Reset the Scroll container
            this.byId("idScrollContainerTableA").setVisible(true);
            this.byId("idScrollContainerTableB").setVisible(false);

			// ---- Reset the UI Table A
            if (this.MaterialInfoTable !== null && this.MaterialInfoTable !== undefined) {
                if (this.MaterialInfoTable.getBusy()) {
                    this.MaterialInfoTable.setBusy(!this.MaterialInfoTable.getBusy());
                }

                this.MaterialInfoTable.setModel(oModel);
            }

            // ---- Reset the UI Table B
            if (this.PackageListTable !== null && this.PackageListTable !== undefined) {
                if (this.PackageListTable.getBusy()) {
                    this.PackageListTable.setBusy(!this.PackageListTable.getBusy());
                }
            }
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});