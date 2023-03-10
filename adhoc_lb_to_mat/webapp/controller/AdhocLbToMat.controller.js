/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Ad-hoc LB-Attachment to the Material
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
    "z/adhoclbtomat/controller/BaseController",
    "z/adhoclbtomat/controls/ExtScanner",
    "z/adhoclbtomat/model/formatter",
    "z/adhoclbtomat/utils/tools",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/core/mvc/Controller"
], function (BaseController, ExtScanner, formatter, tools, JSONModel, History, Controller) {

    "use strict";

    // ---- The app namespace is to be define here!
    var _fragmentPath = "z.adhoclbtomat.view.fragments.";
    var APP = "ADHOC_LB_TOMA";


    return BaseController.extend("z.adhoclbtomat.controller.AdhocLbToMat", {

        // ---- Implementation of formatter functions
        formatter: formatter,

        // ---- Implementation of an utility toolset for generic use
        tools: tools,


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Init:
        // --------------------------------------------------------------------------------------------------------------------

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
            // ---- Define variables for the Mobile App
            this.oView = this.getView();

            this.sScanView    = "Storage";
            this.sShellSource = "";
            this.iBookCount   = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);

            // ---- Define Model data
            this.oDisplayData1 = {
                "HandlingUnit":        "31315046",
                "WarehouseNo":         "L007",
                "WarehouseTask":       "XXX",
                "Material":            "01.179.07.13.0",
                "MatText":             "GEWINDEHUELSE_TS2_1234567890123456789011",
                "Quantity":            "240",
                "UOM":                 "ST",
                "SourceUnit":          "5000172703",
                "DestStorageType":     "",
                "DestStorageLocConf":  "",
                "DestStorageLocation": "",
                "IdentifyHU2":         "",
                "StorageLocation":     "07"
            };

            this.oDisplayData2 = {
                "HandlingUnit":        "21215046",
                "WarehouseNo":         "L009",
                "WarehouseTask":       "YYY",
                "Material":            "01.179.07.15.0",
                "MatText":             "GEWINDEHUELSE_TS3_1234567890123456789099",
                "Quantity":            "620",
                "UOM":                 "ST",
                "SourceUnit":          "5000172703",
                "DestStorageType":     "",
                "DestStorageLocConf":  "",
                "DestStorageLocation": "",
                "IdentifyHU2":         "",
                "StorageLocation":     "09"
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
                "viewStorage":     false,
                "viewMat":         true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueMaterialNo": ""
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

            // ---- Set Focus to main Input field
            setTimeout(() => this.byId("idInput_Material").focus());
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
            var check = this._checkDestStorageLocation();

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
                    that._resetData();
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

		_loadScanData: function (mResult, sScanView) {
            var DisplayModel = new JSONModel();
            var oData = {};

            // ---- Get the right Data for the new model
            if (mResult.material !== null && mResult.material !== undefined && mResult.material !== "" && sScanView === "Material") {
                this.MAT = mResult.material;
            }

            if (mResult.material !== null && mResult.material !== undefined) {
                if (this.MAT === "01.179.07.13.0") {
                    oData = this.oDisplayData1;
                } else {
                    oData = this.oDisplayData2;
                }
            }

            // ---- Get the Data for all not empty values
            if (mResult.material !== null && mResult.material !== undefined && mResult.material !== "") {
                if (sScanView === "Material") {
                    oData.Material = mResult.material;
                } else if (sScanView === "Storage") {
                    oData.StorageLocation = mResult.material;
                } else if (sScanView === "Quantity") {
                    oData.Quantity = mResult.material;
                } else if (sScanView === "Location") {
                    oData.DestStorageType     = "HHO";
                    oData.DestStorageLocation = mResult.material;
                } else if (sScanView === "LocConf") {
                    oData.DestStorageType    = "HHO";
                    oData.DestStorageLocConf = mResult.material;
                }
            }

            // ---- Set the Data for the Model and set the Model to the View
            DisplayModel.setData(oData);

            this.getView().setModel(DisplayModel, "DisplayModel");

            // ---- Change the Scan Model
            this._changeScanModel(sScanView);
        },

		_changeScanModel: function(sScanView) {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking");
            var check = false;
            var id    = "";
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
                "viewMat":      false,
                "viewQuantity": false,
                "viewLocConf":  false,
                "viewLoc":      false
            };

            if (sScanView === "LocConf") {
                check = this._checkDestStorageLocation();
            }

            switch (sScanView) {
                case "Material":
                    id = "idInput_Storage";
                    oData.viewMode    = "Storage";
                    oData.viewStorage = true;
                    break;
                case "Storage":
                    id = "idInput_Quantity";
                    oData.viewMode     = "Quantity";
                    oData.viewQuantity = true;
                    break;
                case "Quantity":
                    id = "idInput_Location";
                    oData.viewMode = "Location";
                    oData.viewLoc  = true;
                    break;
                case "Location":
                    id = "idInput_LocConf";
                    oData.viewMode    = "LocConf";
                    oData.viewLocConf = true;
                    oData.refresh     = false;
                    break;
                case "LocConf":
                    if (check) {
                        id = "idButtonBook_ADHOC_LB_TOMA";
                        oData.viewMode = "Material";
                        oData.booking  = true;
                        oData.refresh  = false;
                        oData.ok       = false;
                    } else {
                        id = "idInput_Location";
                        oData.viewMode    = "Location";
                        oData.viewLoc     = true;
                        oData.showErr     = true;
                        oData.showErrText = sErrMesg;
                    }
                    break;
                default:
                    id = "idInput_Material";
                    oData.viewMode = "Material";
                    oData.viewMat  = true;
                    break;
            }

            this.oScanModel.setData(oData);

            this.byId(id).focus();

            setTimeout(function () {
                that.byId(id).focus();
            }, 300);            
        },

        _checkDestStorageLocation: function () {
            var oModel = this.getView().getModel("DisplayModel");
            var check  = false;

            // ---- ToDo: Check from Backend for not identically dest. Storage Location
            if (oModel !== null && oModel !== undefined) {
                if (oModel.getData() !== null && oModel.getData() !== undefined) {
                    var oData = oModel.getData();

                    if (oData.DestStorageLocation === oData.DestStorageLocConf) {
                        check = true;
                    }
                }
            }

            return check;
        },

        _showBookingError: function () {
            var sErrMesg   = this.getResourceBundle().getText("ErrorBooking");
            var oScanModel = this.oScanModel;
            var oScanData  = oScanModel.getData();
                oScanData.showErr     = true;
                oScanData.showErrText = sErrMesg;

            this.oScanModel.setData(oScanData);
            this.oScanModel.refresh();
        },

		_onOkClicked: function () {
            var iCnt = parseInt(this.getResourceBundle().getText("CountOkInput"), 10);
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
                    
                    if (this.sScanView === "LocConf") {
                        this.iBookCount = 1;
                    } else if (this.sScanView === "Location") {
                        this.iBookCount = 2;
                    }

                    if (sMatNumber !== "" && sMatNumber.length > iCnt) {
                        this._loadScanData(oMaterialNo, this.sScanView);
                    } else {
                        if (this.sScanView === "Quantity" && sMatNumber === "") {
                            this._loadScanData(oMaterialNo, this.sScanView);
                        }
                    }
                }    
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
                    
                    if (this.sScanView === "LocConf") {
                        this.iBookCount = 1;
                    } else if (this.sScanView === "Location") {
                        this.iBookCount = 2;
                    }

                    this._loadScanData(oMaterialNo, this.sScanView);
                }    
            }
		},

		onScan: function (sScanView) {
            this.sScanView = sScanView;

			this.oScanner.openScanDialog(sScanView);
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
			var sSpaceID = this.getResourceBundle().getText("SpaceId");
			var sPageID  = this.getResourceBundle().getText("PageId");

            if (History.getInstance() !== null && History.getInstance() !== undefined) {
                if (History.getInstance().getPreviousHash() !== null && History.getInstance().getPreviousHash() !== undefined) {
                    var spaceHome  = "#Launchpad-openFLPPage?pageId=" + sPageID + "&spaceId=" + sSpaceID;
                    var shellHome  = "#Shell-home";

                    var sPreviousHash = History.getInstance().getPreviousHash();

                    if (sPreviousHash.includes("pageId=Z_EEWM_PG_MOBILE_DIALOGS&spaceId=Z_EEWM_SP_MOBILE_DIALOGS")) {
                        this.sShellSource = spaceHome;
                    } else {
                        this.sShellSource = shellHome;
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
                var sScanView = this.oScanModel.getData().viewMode;

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();
                        that.onPressOk(sScanView);
						break;			                
                    case 112: // ---- F1 Key
                        evt.preventDefault();
                        var controlF1 = this.BookButton;

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

		_resetData: function () {
            var DisplayModel = this.getView().getModel("DisplayModel");
            var oData = {};

            if (this.MAT === "01.179.07.13.0") {
                oData = this.oDisplayData1;
            } else {
                oData = this.oDisplayData2;
            }

            this.oDisplayData1.DestStorageType     = "";
            this.oDisplayData1.DestStorageLocConf  = "";
            this.oDisplayData1.DestStorageLocation = "";

            this.oDisplayData2.DestStorageType     = "";
            this.oDisplayData2.DestStorageLocConf  = "";
            this.oDisplayData2.DestStorageLocation = "";

            // ---- Set the Data for the Model and set the Model to the View
            DisplayModel.setData(oData);

            this.getView().setModel(DisplayModel, "DisplayModel");
        },

        _resetAll: function () {
            var oModel = new JSONModel([]);

            // ---- Reset the Main Model
            var DisplayModel = new JSONModel();

            var oDisplayData = {
                "HandlingUnit":        "",
                "WarehouseNo":         "",
                "WarehouseTask":       "",
                "Material":            "",
                "MatText":             "",
                "Quantity":            "",
                "UOM":                 "",
                "SourceUnit":          "",
                "DestStorageType":     "",
                "DestStorageLocConf":  "",
                "DestStorageLocation": "",
                "IdentifyHU2":         "",
                "StorageLocation":     ""
            };

            DisplayModel.setData(oDisplayData);

            this.getView().setModel(DisplayModel, "DisplayModel");

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
                "viewStorage":     false,
                "viewMat":         true,
                "viewQuantity":    false,
                "viewLocConf":     false,
                "viewLoc":         false,
                "valueMaterialNo": ""
            };

            this.oScanModel.setData(oData);

            // ---- Reset of the booking count
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});