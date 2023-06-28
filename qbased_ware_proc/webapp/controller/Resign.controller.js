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
                    
                    this.sViewMode = oScanData.viewMode;
                    
                    if (sManNumber !== null && sManNumber !== undefined && sManNumber !== "") {
                        sManNumber = oScanData.valueManuallyNo.trim();
                        sManNumber = this._removePrefix(sManNumber);
                        sManNumber = sManNumber.toUpperCase();

                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);
                    } else {
                        sManNumber = "";
                    }

                    if (this.sViewMode === "Handling" && sManNumber !== "") {
                        if (this.sActiveQMode === "W") {
                            this._loadQuantityData(sManNumber);
                        } else {
                            var sErrMsg = this.getResourceBundle().getText("HuSelectionErr", [sManNumber, this.iHU]);

                            if (this.iHU === sManNumber) {
                                this._loadQuantityData(sManNumber);
                            } else {
                                this.oScanModel.setProperty("/valueManuallyNo", "");
                                this._setFocus("idInput_HU");

                                tools.alertMe(sErrMsg);

                                return;
                            }
                        }
                    } else if (this.sViewMode === "Quantity") {
                        this._handleQuantityData();                           
                    } else if (this.sViewMode === "LocConf" && sManNumber !== "") {
                        this._handleFinalData(sManNumber);
                    }

                    this.iScanModusAktiv = 1;
                }    
            }

            this.oScanModel.setProperty("/valueManuallyNo", "");
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
                var urlParam = { "WarehouseTaskType": "H", "BookConfirm": true, "TargetQuantity": oData.ActualQuantity};
    
                var oModel = this._getServiceUrl()[0];
                    oModel.update(sPath, urlParam, {
                        error: function(oError, resp) {
                            tools.handleODataRequestFailed(oError, resp, true);
                        },
                        success: function(rData, oResponse) {
                            // ---- Check for complete final booking
                            if (rData !== null && rData !== undefined) {
                                if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "E") {
                                    // ---- Coding in case of showing Business application Errors
                                    tools.alertMe(rData.SapMessageText, "");
                                    
                                    that._resetAll();
                                    that._setFocus("idInput_HU");

                                    return;
                                } else if (rData.SapMessageType !== null && rData.SapMessageType !== undefined && rData.SapMessageType === "I") {
                                    // ---- Coding in case of showing Business application Informations
                                    tools.alertMe(rData.SapMessageText, "");
                                }
                            }

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
                                if (rData.results.length > 0) {
                                    if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === true) {
                                        // ---- Coding in case of showing Business application Errors
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "E" && rData.results[0].StatusGoodsReceipt === false) {
                                        // ---- Coding in case of showing Business application Errors
                                        tools.showMessageError(rData.results[0].SapMessageText, "");
                                    } else if (rData.results[0].SapMessageType !== null && rData.results[0].SapMessageType !== undefined && rData.results[0].SapMessageType === "I") {
                                        // ---- Coding in case of showing Business application Informations
                                        tools.alertMe(rData.results[0].SapMessageText, "");
                                    }
                                }
    
                                let data = rData.results[0].to_WarehouseTasks.results;

                                for (let i = 0; i < data.length; i++) {
                                    let item = data[i];

                                    if (that.sActiveQMode === "H") {
                                        if (item.HandlingUnitId === iHU) {
                                            that._setWareHouseTableData(item, iHU);
                                        }
                                    } else if (that.sActiveQMode === "W") {
                                        if (item.WarehouseTaskId === iHU) {
                                            that._setWareHouseTableData(item, iHU);
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
            this.oDisplayModel.setData([]);
            this.oDisplayModel.setData(oData);

            this.iScanModusAktiv = 0;

            // ---- Change the Main focus to HU or Warehouse Task
            if (this.sActiveQMode === "W") {
                this._handleHandlingUnitData(sViewMode, sManNumber);
            } else {
                this._handleHandlingUnitData(sViewMode, sManNumber);
                // this._loadQuantityData(sViewMode, sManNumber);
            }
        },

        _handleHandlingUnitData: function (sManNumber) {
            this.oScanModel.setProperty("/viewMode", "Handling");
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewHu", true);

            this._setFocus("idInput_HU");
        },

        _loadQuantityData: function (sManNumber) {
            this.oScanModel.setProperty("/viewMode", "Quantity");
            this.oScanModel.setProperty("/viewQuantity", true);
            this.oScanModel.setProperty("/viewHu", false);

            this._setFocus("idInput_Quantity");
        },

		_handleQuantityData: function () {
            var sErrMesg = this.getResourceBundle().getText("OnlySmallQuantities");
            var iQuantity = parseInt(this.oDisplayModel.getProperty("/TargetQuantity"), 10);

            this.oScanModel.setProperty("/showErr", false);
            this.oScanModel.setProperty("/showErrText", "");

            if (this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                var iActualQuantity = parseInt(this.oScanModel.getProperty("/valueManuallyNo"), 10);
                
                if (iActualQuantity > iQuantity) {
                    tools.alertMe(sErrMesg);

                    this.oScanModel.setProperty("/valueManuallyNo", "");
               
                    // ---- Set Focus to default Input field
                    this._setFocus("idInput_Quantity");

                    return;
                } else if (iActualQuantity < iQuantity) {
                    this.ActualQuantity = this.oScanModel.getProperty("/valueManuallyNo");

                    this.onQuantityScanOpen();
                } else if (iActualQuantity === iQuantity) {
                    this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
                    this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
               
                    // ---- Set Focus to default Input field
                    this.oScanModel.setProperty("/valueManuallyNo", "");
                    this._setFocus("idInput_Quantity");
                }
            } else {
                this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
                this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            }
           
            // ---- Set Focus to default Input field
            this.oScanModel.setProperty("/valueManuallyNo", "");
            this._setFocus("idInput_Quantity");
            this._resetQuantity();
		},

        _handleFinalData: function (sManNumber) {
            var sErrMesg  = this.getResourceBundle().getText("StorageBinErr", sManNumber);
            var tSTime    = this.getResourceBundle().getText("ShowTime");
            var check = false;
            var id    = "idInput_LocConf";
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
                id = "idInput_LocConf";

                this.oScanModel.setProperty("/viewLocConf", true);
                this.oScanModel.setProperty("/booking", false);
                this.oScanModel.setProperty("/refresh", true);
                this.oScanModel.setProperty("/ok", true);

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
        // ---- Dialog Functions
        // --------------------------------------------------------------------------------------------------------------------

		onQuantityScanOpen: function () {
			var fragmentFile = _fragmentPath + "DialogQuantityScan";
			var oView = this.getView();
			var that = this;
			
            // ---- Starts the Bookung Dialog for Handling Units
			if (!this.getView().dialogQuantityScan) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: fragmentFile,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oView.dialogQuantityScan = oDialog;
					oView.dialogQuantityScan.addStyleClass(that.getOwnerComponent().getContentDensityClass());
                    oView.dialogQuantityScan.open();
				});
			} else {
                oView.dialogQuantityScan.open();
            }
 		},

        onQuantityScanClose: function () {
            if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.ActualQuantity = this.oDisplayModel.getProperty("/TargetQuantity");
            this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            this._resetQuantity();
        },

		onQuantityScanAfterClose: function () {
            this._setFocus("idInput_LocConf");
		},

		onQuantityScanSave: function () {
			if (this.getView().dialogQuantityScan) {
				this.getView().dialogQuantityScan.close();
			}

            this.oDisplayModel.setProperty("/ActualQuantity", this.ActualQuantity);
            this._resetQuantity();
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
                        sManNumber = sManNumber.toUpperCase();

                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sManNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                    }
                    
                    if (sScanNumber !== null && sScanNumber !== undefined && sScanNumber !== "") {
                        sScanNumber = oEvent.getParameter("valueScan").trim()
                        sScanNumber = sManNumber.toUpperCase();
                        
                        // ---- Check for Data Matix Code
                        var check = tools.checkForDataMatrixArray(sScanNumber);

                        if (check[0]) {
                            var sScanNumber = check[1];
                        }

                        this.oScanModel.setProperty("/valueSuffix", oEvent.getParameter("valueSuffix"));
                        this.oScanModel.setProperty("/valueManuallyNo", sScanNumber);

                        this.sSuffix = oEvent.getParameter("valueSuffix");
                        sManNumber = sScanNumber;
                    }

                    if (iScanAktiv !== null && iScanAktiv !== undefined && iScanAktiv !== "") {
                        this.iScanModusAktiv = iScanAktiv;
                    } else {
                        this.iScanModusAktiv = 2;
                    }

                    if (this.sViewMode === "Handling" && this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                        if (this.sActiveQMode === "W") {
                            this._loadQuantityData(sManNumber);
                        } else {
                            var sErrMsg = this.getResourceBundle().getText("HuSelectionErr", [sManNumber, this.iHU]);

                            if (this.iHU === sManNumber) {
                                this._loadQuantityData(sManNumber);
                            } else {
                                this.oScanModel.setProperty("/valueManuallyNo", "");
                                this._setFocus("idInput_HU");

                                tools.alertMe(sErrMsg);

                                return;
                            }
                        }
                    } else if (this.sViewMode === "Quantity") {
                         this._handleQuantityData();                           
                    } else if (this.sViewMode === "LocConf" && this.oScanModel.getProperty("/valueManuallyNo") !== "") {
                        this._handleFinalData(sManNumber);
                    }
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
            var that = this;

			// ---- Set the Shortcut to buttons
			$(document).keydown($.proxy(function (evt) {
                var controlF2 = that.byId("idInput_HU");

                // ---- Now call the actual event/method for the keyboard keypress
                switch (evt.keyCode) {
			        case 13: // ---- Enter Key
                        evt.preventDefault();

                        if (sRoute === "Resign") {
                            if (that.iScanModusAktiv < 2) {
                                that.onPressResignOk();
                            } else {
                                that.iScanModusAktiv = 0;
                            }
                        }

                        evt.keyCode = null;

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
                                if (controlF2 && controlF2.getEnabled()) {
                                    controlF2.fireChange();
                                }
                            }
                        }

                        evt.keyCode = null;

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

        _resetQuantity: function () {
            // ---- Reset the Quantity view
            this.oScanModel.setProperty("/viewQuantity", false);
            this.oScanModel.setProperty("/viewMode", "LocConf");
            this.oScanModel.setProperty("/viewLocConf", true);
            this.oScanModel.setProperty("/ok", false);
            this.oScanModel.setProperty("/valueManuallyNo", "");
        },

        _resetAll: function () {
            // ---- Reset the Main Model
            this.oDisplayModel.setData([]);

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
                
            this.sScanType  = "";
            this.iBookCount = 0;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // END
        // --------------------------------------------------------------------------------------------------------------------

    });
});