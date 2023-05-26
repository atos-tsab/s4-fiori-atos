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
    var _fragmentPath   = "z.adhoclbtomat.view.fragments.";
	var _sAppModulePath = "z/adhoclbtomat/";
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

            this.sWN = "";
            this.iHU = "";
            this.sViewMode       = "Material";
            this.sShellSource    = "#Shell-home";
            this.iScanModusAktiv = 0;

            // ---- Define the Owner Component for the Tools Util
            tools.onInit(this.getOwnerComponent());

            // ---- Define the Booking Button
            this.BookButton = this.byId("idButtonBook_" + APP);
        },

        _initLocalModels: function () {
            var sTitle = this.getResourceBundle().getText("title");

            // ---- Get the Main Models.
            this.oModel = this.getOwnerComponent().getModel();

            // ---- Set the Main Models.
            this.getView().setModel(this.oModel);

            // ---- Set Jason Models.
            var oData = {
                "viewMode":          "Material",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewMat":           true,
                "viewStorage":       false,
                "viewLoc":           false,
                "valueManuallyNo":   ""
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
            this._setFocus("idInput_Material");
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

        onPressOk: function (sViewMode) {
            this.sViewMode = sViewMode;

            // ---- Change the Scan Model
            this._onOkClicked();
        },

        onPressRefresh: function () {
            this._resetAll();
        },

		_onOkClicked: function () {
            var oScanModel = this.oScanModel;

            if (oScanModel !== null && oScanModel !== undefined) {
                if (oScanModel.getData() !== null && oScanModel.getData() !== undefined) {
                    var oScanData  = oScanModel.getData();
                    var sMatNumber = oScanData.valueManuallyNo;
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oScanData.valueManuallyNo.trim();
                    } else {
                        sMatNumber = "";
                    }

                    var oResult = {
                        "sView":     this.sViewMode,
                        "material":  sMatNumber
                    };

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Material") {
                        this.loadMaterialData(oResult, this.sViewMode);
                    } else if (this.sViewMode === "LocConf") {
                        this.loadStorageBinData(oResult, this.sViewMode);
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

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
                this.oModel.create(sPath, urlData, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);

                        that._resetByLocation();
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
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
                
                                // ---- Set Focus to main Input field
                                that._setFocus("idInput_HU");
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

        _updateWarehouseTask: function () {
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking", this.iHU);
            var sOkMesg  = this.getResourceBundle().getText("OkMesBooking", this.iHU);
            var tSTime   = this.getResourceBundle().getText("ShowTime");
            var that = this;

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
                    oData.to_WarehouseTask.BookConfirm = true;
                    oData.to_WarehouseTask.DestinationStorageBin  = oData.Book2StorageBin;
                    oData.to_WarehouseTask.DestinationStorageType = oData.Book2StorageType;

                var sWarehouseNumber = oData.to_WarehouseTask.WarehouseNumber;
                var sWarehouseTask   = oData.to_WarehouseTask.WarehouseTaskId;

                var sPath = "/WarehouseTask(WarehouseNumber='" + sWarehouseNumber + "',WarehouseTaskId='" + sWarehouseTask + "')";

                // ---- Update an existing Warehouse Task
                this.oModel.update(sPath, oData.to_WarehouseTask, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);

                        that._resetByLocation();
                    },
                    success: function(rData, oResponse) {
                        // ---- Check for complete final booking
                        if (rData !== null && rData !== undefined && rData.SapMessageType === "E") {
                            tools.alertMe(rData.SapMessageText, "");
                            
                            that._resetAll();
                            that._setFocus("idInput_HU");

                            return;
                        } else if (rData !== null && rData !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }

                        if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content") {
                            that.oScanModel.setProperty("/showOk", true);
                            that.oScanModel.setProperty("/showOkText", sOkMesg);       

                            // ---- Do nothing -> Good case
                            setTimeout(function () {
                                that._resetAll();
                
                                // ---- Set Focus to main Input field
                                that._setFocus("idInput_HU");
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
        // ---- Loading Functions
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
                        tools.alertMe(rData.SapMessageText, "");
                    }

					if (rData !== null && rData !== undefined && rData !== "") {
                        that.sWN = rData.ParameterValue;
                    }
				}
			});
        },

	    loadMaterialData: function (oResult, sViewMode) {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var that = this;

            this.iHU = oResult.material;
            this.iHU = "";

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
            var sPath = "/HandlingUnit(WarehouseNumber='" + this.sWN + "',HandlingUnitId='" + this.iHU + "')";
            
            var oModel = this._getServiceUrl()[0];
                oModel.read(sPath, {
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    urlParameters: {
                        "$expand": "to_WarehouseTask"
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
                            that._setMaterialData(rData, sViewMode);
                        } else {
                            var sErrMsg = this.getResourceBundle().getText("HandlingUnitErr", that.iHU);

                            tools.alertMe(sErrMsg, "");
                        }
                    }
                });
        },

		_setMaterialData: function (oData, sViewMode) {
            // ---- Set the Data for the Model and set the Model to the View
            var oDisplayModel = this.oDisplayModel;
                oDisplayModel.setData(oData);
                
            if (oData.to_WarehouseTask !== null && oData.to_WarehouseTask !== undefined) {
                var sStorageBin = oData.to_WarehouseTask.DestinationStorageBin;

                if (sStorageBin !== null && sStorageBin !== undefined && sStorageBin !== "") {
                    this.oDisplayModel.setProperty("/Book2StorageBin", oData.to_WarehouseTask.DestinationStorageBin);
                    this.oDisplayModel.setProperty("/Book2StorageType", oData.to_WarehouseTask.DestinationStorageType);
                }
            }

            // ---- Change the Scan Model
            this._changeScanModel(sViewMode);
        },

	    loadStorageBinData: function (oResult, sViewMode) {
            this.sStorageBin = oResult.material;

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
                                        that._setStorageBinData(data, sViewMode);
                                    }
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

		_setStorageBinData: function (oData, sViewMode) {
            // ---- Set the Data for the Model and set the Model to the View
            if (sViewMode === "Location") {
                this.oDisplayModel.setProperty("/Book2StorageBin", oData.StorageBinID);
                this.oDisplayModel.setProperty("/Book2StorageType", oData.StorageType);
            } else if (sViewMode === "LocConf") {
                this.oDisplayModel.setProperty("/Book2StorageBinVerify", oData.StorageBinID);
            }

            // ---- Change the Scan Model
            this._changeScanModel(sViewMode);
        },

		// --------------------------------------------------------------------------------------------------------------------

		_changeScanModel: function(sViewMode) {
            var defaultStorage = this.getResourceBundle().getText("DefaultStorageLocation");
            var sErrMesg = this.getResourceBundle().getText("ErrorBooking");
            var sTitle1  = this.getResourceBundle().getText("title1");
            var id    = "";
            var that  = this;

            // ---- Change the Scan Model
            var oData = {
                "viewMode":          "",
                "viewTitle":         sTitle1,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "showInspectionLot": false,
                "viewStorage":       false,
                "viewMat":           false,
                "viewLoc":           false
            };

            switch (sViewMode) {
                case "Material":
                    id = "idInput_Storage";
                    oData.viewMode    = "Storage";
                    oData.viewStorage = true;

                    break;
                case "Storage":
                    id = "idInput_Location";
                    oData.viewMode = "Location";
                    oData.viewLoc  = true;
                    oData.refresh  = false;
                    oData.valueManuallyNo  = defaultStorage;

                    break;
                case "Location":
                    id = "idButtonBook_ADHOC_LB_TOMA";
                    oData.viewMode = "Material";
                    oData.booking  = true;
                    oData.refresh  = false;
                    oData.ok       = false;

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

        _showBookingError: function () {
            var sErrMesg   = this.getResourceBundle().getText("ErrorBooking");
            var oScanModel = this.oScanModel;

            var oScanData  = oScanModel.getData();
                oScanData.showErr     = true;
                oScanData.showErrText = sErrMesg;

            this.oScanModel.setData(oScanData);
            this.oScanModel.refresh();
        },


		// --------------------------------------------------------------------------------------------------------------------
		// ---- QR/Bar Code Ext Scanner Event Handlers
		// --------------------------------------------------------------------------------------------------------------------

		onScanned: function (oEvent) {
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sMatNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    if (sMatNumber !== null && sMatNumber !== undefined && sMatNumber !== "") {
                        sMatNumber = oEvent.getParameter("valueManuallyNo").trim()

                        this.oScanModel.setProperty("/valueManuallyNo", sMatNumber);
                    }
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                    }

                    var oResult = {
                        "sView":     this.sViewMode,
                        "material":  sMatNumber,
                        "scanValue": sScanNumber
                    };
                    
                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Material") {
                        this.loadMaterialData(oResult, this.sViewMode);
                    } else if (this.sViewMode === "Location") {
                        this.loadStorageBinData(oResult, this.sViewMode);
                    } else if (this.sViewMode === "LocConf") {
                        this.loadStorageBinData(oResult, this.sViewMode);
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
                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk(that.sViewMode);
                        } else {
                            that.iScanModusAktiv = 0;
                        }

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
    
                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk(that.sViewMode);
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
            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
            }
         },

         _resetByLocation: function () {
            this.oScanModel.setProperty("/viewMode", "LocConf");
            this.oScanModel.setProperty("/refresh", false);
            this.oScanModel.setProperty("/viewLocConf", true);
        },

        _resetAll: function () {
            var sTitle = this.getResourceBundle().getText("title");

            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

            // ---- Reset the Scan Model
            var oData = {
                "viewMode":          "Material",
                "viewTitle":         sTitle,
                "booking":           false,
                "refresh":           true,
                "ok":                true,
                "showOk":            false,
                "showErr":           false,
                "showOkText":        "",
                "showErrText":       "",
                "viewMat":           true,
                "viewStorage":       false,
                "viewLoc":           false,
                "valueManuallyNo":   ""
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