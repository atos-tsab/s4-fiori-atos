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

            this.sWN    = "";
            this.iMat   = "";
            this.sLType = "";
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
                "viewLoc":           false,
                "HURequirement":     "",
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
            this.loadUserDataWN();

            // ---- Set Focus to main Input field
            this._setFocus("idInput_Material");
        },

        
        // --------------------------------------------------------------------------------------------------------------------
        // ---- Button Event Handlers
        // --------------------------------------------------------------------------------------------------------------------

        onPressBooking: function () {
            this._createWarehouseTask();
        },

        onPressOk: function (sViewMode) {
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
                    var sManNumber = oScanData.valueManuallyNo;
                    
                    this.sViewMode = oScanData.viewMode;
 
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oScanData.valueManuallyNo.trim();
                        sManNumber = this._removePrefix(sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    this.iScanModusAktiv = 1;

                    if (this.sViewMode === "Material") {
                        this._loadMaterialData(sManNumber);
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
                        }
                    }
                }    
            }
		},


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Booking Functions
        // --------------------------------------------------------------------------------------------------------------------

        _createWarehouseTask: function () {
            var sWareTaskParam = this.getResourceBundle().getText("WarehouseTaskTypeParam", this.iMat);
            var sErrMsgHU = this.getResourceBundle().getText("HandlingUnitErr", this.iMat);
            var sErrMesg  = this.getResourceBundle().getText("ErrorBooking", this.iMat);
            var sOkMesg   = this.getResourceBundle().getText("OkMesBooking", this.iMat);
            var tSTime    = this.getResourceBundle().getText("ShowTime");
            var that = this;

            // ---- Check for HU for Material
            if (this.iHU === "") {
                this.oScanModel.setProperty("/refresh", true);

                tools.showMessageError(sErrMsgHU, "");
                
                return;
            }

            if (this.oDisplayModel !== null && this.oDisplayModel !== undefined) {
                var oData = this.oDisplayModel.getData();
 
                var sPath   = "/WarehouseTask";
                var urlData = {
                    "WarehouseNumber":       oData.WarehouseNumber,
                    "WarehouseTaskType":     sWareTaskParam,
                    "HandlingUnitId":        this.iHU,
                    "BookConfirm":           false,
                    "BookMoveHu":            true,
                    "DestinationStorageBin": oData.StorageBinID
                };

                // ---- Create new Warehouse Task
                var oModel = this._getServiceUrl()[0];
                    oModel.create(sPath, urlData, {
                        error: function(oError, resp) {
                            that.oScanModel.setProperty("/refresh", true);

                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus("idInput_Material");
    
                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }
                            
                            if (parseInt(oResponse.statusCode, 10) === 204 && oResponse.statusText === "No Content" || 
                                parseInt(oResponse.statusCode, 10) === 201 && oResponse.statusText === "Created") {
                                that.oScanModel.setProperty("/showOk", true);
                                that.oScanModel.setProperty("/showOkText", sOkMesg);

                                // ---- Do nothing -> Good case
                                setTimeout(function () {
                                    that._resetAll();
                    
                                    // ---- Set Focus to main Input field
                                    that._setFocus("idInput_Material");
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

	    loadUserDataWN: function () {
            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sLType1 = this.getResourceBundle().getText("LType1");
            var sLType2 = this.getResourceBundle().getText("LType2");
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
                    if (rData !== null && rData !== undefined) {
                        if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                            // ---- Coding in case of showing Business application Errors
                            tools.showMessageError(rData.SapMessageText, "");
                        } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                            // ---- Coding in case of showing Business application Informations
                            tools.alertMe(rData.SapMessageText, "");
                        }
                    }

					if (rData !== null && rData !== undefined && rData !== "") {
                        // ---- Check for Warehouse Number
                        if (rData.ParameterValue === "") {
                            tools.showMessageError(sWarehouseNumberErr, "");
                            
                            return;
                        }

                        that.sWN = rData.ParameterValue;

                        if (that.sWN === "L007") {
                            that.sLType = sLType1;
                        } else if (that.sWN === "L009") {
                            that.sLType = sLType2;
                        } else {
                            that.sLType = "";
                        }
                    }
				}
			});
        },

	    _loadMaterialData: function (sManNumber) {
            this.iMat = sManNumber;

            var sWarehouseNumberErr = this.getResourceBundle().getText("WarehouseNumberErr");
            var sStockType = this.getResourceBundle().getText("StockTypeParam");
            var sErrMsg = this.getResourceBundle().getText("MaterialErr", this.iMat);
            var that = this;

            // ---- Check for Warehouse Number
            if (this.sWN === "") {
                tools.showMessageError(sWarehouseNumberErr, "");
                
                return;
            }

            // ---- Read the HU Data from the backend
			var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("WarehouseNumber", sap.ui.model.FilterOperator.EQ, this.sWN));
                aFilters.push(new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, this.iMat));
                aFilters.push(new sap.ui.model.Filter("StatusOpenWarehouseTask", sap.ui.model.FilterOperator.EQ, false));
                aFilters.push(new sap.ui.model.Filter("StockTypeLocn", sap.ui.model.FilterOperator.EQ, sStockType));
                aFilters.push(new sap.ui.model.Filter("StorageType", sap.ui.model.FilterOperator.EQ, this.sLType));
                
            var oModel = this._getServiceUrl()[0];
                oModel.read("/HandlingUnit", {
                    filters: aFilters,
                    urlParameters: {
                        "$top": 1
                    },
                    error: function(oError, resp) {
                        tools.handleODataRequestFailed(oError, resp, true);
                    },
                    success: function(rData, response) {
                        if (rData.results !== null && rData.results !== undefined) {
                            // ---- Check for complete final booking
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === true) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === false) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");
                                    
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            // ---- Start with showing data
                            if (rData.results.length > 0) {
                                that._setMaterialData(rData, sManNumber);
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

        _setMaterialData: function (oData, sManNumber) {
            var id = "idInput_Material";

            // ---- Set the Display data to the View            
            this.oDisplayModel.setData({});
            this.oDisplayModel.setData(oData.results[0]);
            this.oDisplayModel.setProperty("/StorageType", "");
            
            // ---- Get the HU data for the scanned Material
            this.iHU = oData.results[0].HandlingUnitId;

            this._handleHuData(sManNumber);
        },

	    _loadStorageBinData: function (sManNumber) {
            this.sStorageBin = sManNumber.toUpperCase();

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
                            if (rData.results.length > 0) {
                                if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === true) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");

                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === false) {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.showMessageError(rData.results[0].SapMessageText, "");
                                    
                                    return;
                                } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.results[0].SapMessageText, "");
                                }
                            }

                            if (rData.results.length > 0) {
                                for (let i = 0; i < rData.results.length; i++) {
                                    let data = rData.results[i];                                    
                                    
                                    if (data.StorageBinID === that.sStorageBin) {
                                        that._setStorageBinData(data, that.sStorageBin);
                                    }
                                }
                            } else {
                                tools.alertMe(sErrMsg, "");
                            }
                        }
                    }
                });
        },

		_setStorageBinData: function (oData, sManNumber) {
            // ---- Set the Data for the Model and set the Model to the View
            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Location") {
                    this.oScanModel.setProperty("/HURequirement", oData.HURequirement);

                    this.oDisplayModel.setProperty("/StorageBinID", oData.StorageBinID);
                    this.oDisplayModel.setProperty("/StorageType", oData.StorageType);

                    this._handleLocationData();
                }
            }
        },

		// --------------------------------------------------------------------------------------------------------------------

		_handleHuData: function (sManNumber) {
            var id = "idInput_Material";
 
            if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                if (this.sViewMode === "Material") {
                    // ---- Set Scan Model data
                    this.oScanModel.setProperty("/viewMat", false);
                    this.oScanModel.setProperty("/viewMode", "Location");
                    this.oScanModel.setProperty("/viewLoc", true);
    
                    id = "idInput_Location";
                }
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");

            // ---- Set Focus to main Input field
            this._setFocus(id);
		},

        _handleLocationData: function () {
            var id = "idButtonBookStorage";

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            this.oScanModel.setProperty("/viewMode", "Material");
            this.oScanModel.setProperty("/viewLoc", false);
            this.oScanModel.setProperty("/booking", true);
            this.oScanModel.setProperty("/refresh", false);
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueManuallyNo", "");
    
            // ---- Set Focus to default Input field
            this._setFocus(id);
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
            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getParameter("valueManuallyNo") !== null && oEvent.getParameter("valueManuallyNo") !== undefined) {
                    var sManNumber  = oEvent.getParameter("valueManuallyNo");
                    var sScanNumber = oEvent.getParameter("valueScan");
                    
                    this.sViewMode = this.oScanModel.getProperty("/viewMode");                  

                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oEvent.getParameter("valueManuallyNo").trim();
                        sManNumber = sManNumber.toUpperCase();
                        sManNumber = this._removePrefix(sManNumber);

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        sScanNumber = sManNumber.toUpperCase();
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);
                        sManNumber = sScanNumber;
                    }

                    this.iScanModusAktiv = 2;

                    if (this.sViewMode === "Material") {
                        this._loadMaterialData(sManNumber);
                    } else if (this.sViewMode === "Location") {
                        if (sManNumber !== "") {
                            this._loadStorageBinData(sManNumber);
                        }
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
                var controlF2 = that.byId("idInput_Material");

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (that.iScanModusAktiv < 2) {
                            that.onPressOk(that.sViewMode);
                        } else {
                            that.iScanModusAktiv = 0;
                        }

                        evt.keyCode = null;

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
                            if (controlF2 && controlF2.getEnabled()) {
                                controlF2.fireChange();
                            }
                        }

                        evt.keyCode = null;
                        
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
            var that = this;

            if (sap.ui.getCore().byId(id) !== null && sap.ui.getCore().byId(id) !== undefined) {
                setTimeout(() => sap.ui.getCore().byId(id).focus({ preventScroll: true, focusVisible: true }));
            } else if (this.byId(id) !== null && this.byId(id) !== undefined) {
                setTimeout(() => that.getView().byId(id).focus({ preventScroll: true, focusVisible: true }));
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
                "viewLoc":           false,
                "HURequirement":     "",
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