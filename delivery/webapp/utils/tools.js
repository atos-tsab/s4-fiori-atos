/************************************************************************
 * Atos Germany
 ************************************************************************
 * Created by     : Thomas Sablotny, Atos Germany
 ************************************************************************
 * Description    : BPW - eEWM - Mobile App Lieferung
 ************************************************************************
 * Authorization  : Checked by backend
 ************************************************************************/


sap.ui.define([
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (CoreLibrary, Controller, JSONModel) {

    "use strict";

    var ValueState = CoreLibrary.ValueState;

    return {

        // --------------------------------------------------------------------------------------------------------------------
        // ---- Init
        // --------------------------------------------------------------------------------------------------------------------

        onInit: function (ownerComponent) {
            this.OwnerComponent = ownerComponent;
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Generic Functions for Components
        // --------------------------------------------------------------------------------------------------------------------

        onComboBoxChange: function (oView, oEvent, param, msgText, trigger) {
            var msg = this.getResourceBundle().getText(msgText);
            var oModel = oView.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var oComboBox = oEvent.getSource();
                    var sKey = oComboBox.getSelectedKey();
                    var sValue = oComboBox.getValue();

                    if (!sKey && sValue) {
                        oComboBox.setValueState(ValueState.Error);
                        oComboBox.setValueStateText(msg);
                    } else {
                        oComboBox.setValueState(ValueState.None);

                        if (trigger === "V") {
                            oModel.setProperty("/" + param, sValue);
                        } else {
                            oModel.setProperty("/" + param, sKey);
                        }
                    }
                }
            }
        },

        onSetComboBoxData: function (oModel, component, mData, collection, key, txt, atxt, asorter, showAddText) {
            // ---- Set data to the Models
            oModel.setData({
                [collection]: mData.results
            });

            // ---- Create a ComboBox binding
            var oItemTemplate = new sap.ui.core.ListItem();
            oItemTemplate.bindProperty("key", key);
            oItemTemplate.bindProperty("text", txt);

            if (showAddText) {
                oItemTemplate.bindProperty("additionalText", atxt);
            }

            var oComboBox = component;

            if (oComboBox !== null && oComboBox !== undefined) {
                oComboBox.setModel(oModel);

                oComboBox.bindItems({
                    path: "/" + collection,
                    template: oItemTemplate,
                    sorter: { path: asorter },
                    templateShareable: false
                });

                oComboBox.setSelectedKey(undefined);
             }
        },

        onSetComboBoxDataWithSelection: function (oModel, component, mData, collection, key, txt, atxt, asorter, param, entry, showAddText) {
            // ---- Set data to the Models
            oModel.setData({
                [collection]: mData.results
            });

            // ---- Create a ComboBox binding
            var oItemTemplate = new sap.ui.core.ListItem();
                oItemTemplate.bindProperty("key", key);
                oItemTemplate.bindProperty("text", txt);

            if (showAddText) {
                oItemTemplate.bindProperty("additionalText", atxt);
            }

            var oComboBox = component;

            if (oComboBox !== null && oComboBox !== undefined) {
                oComboBox.setModel(oModel);

                oComboBox.bindItems({
                    path: "/" + collection,
                    template: oItemTemplate,
                    sorter: { path: asorter },
                    templateShareable: false
                });

                // ---- Set the selection for the ComboBox DepartmentName
                if (mData.results.length > 0) {
                    for (var i = 0; i < mData.results.length; i++) {
                        var val = mData.results[i];

                        if (val[param] === entry) {
                            oComboBox.setSelectedKey(val[param]);
                            oComboBox.setValue(val[param]);
                        } else {

                        }
                    }
                } else {
                    oComboBox.setSelectedKey(undefined);
                }
            }
        },

        onSetSelectBoxDataWithSelection: function (oModel, component, mData, collection, key, txt, atxt, asorter, param, entry, showAddText) {
            // ---- Set data to the Models
            oModel.setData({
                [collection]: mData.results
            });

            // ---- Create a ComboBox binding
            var oItemTemplate = new sap.ui.core.ListItem();
                oItemTemplate.bindProperty("key", key);
                oItemTemplate.bindProperty("text", txt);
                oItemTemplate.bindProperty("enabled", "enabled");

            if (showAddText) {
                oItemTemplate.bindProperty("additionalText", atxt);
            }

            var oComboBox = component;

            if (oComboBox !== null && oComboBox !== undefined) {
                oComboBox.setModel(oModel);

                oComboBox.bindItems({
                    path: "/" + collection,
                    template: oItemTemplate,
                    sorter: { path: asorter },
                    templateShareable: false
                });

                // ---- Set the selection for the ComboBox DepartmentName
                if (mData.results.length > 0) {
                    for (var i = 0; i < mData.results.length; i++) {
                        var val = mData.results[i];

                        if (val[param] === entry) {
                            oComboBox.setSelectedKey(val[param]);
                         }
                    }
                } else {
                    oComboBox.setSelectedKey(undefined);
                }
            }
        },

        onSetInputBoxData: function (oModel, component, mData, collection, key, txt, atxt, asorter, showAddText) {
            // ---- Set data to the Models
            oModel.setData({
                [collection]: mData.results
            });

            // ---- Create a Input Box binding
            var oItemTemplate = new sap.ui.core.ListItem();
            oItemTemplate.bindProperty("key", key);
            oItemTemplate.bindProperty("text", txt);

            if (showAddText) {
                oItemTemplate.bindProperty("additionalText", atxt);
            }

            var oInputBox = component;

            if (oInputBox !== null && oInputBox !== undefined) {
                oInputBox.setModel(oModel);

                oInputBox.bindObject({
                    path: "/" + collection,
                    template: oItemTemplate,
                    sorter: { path: asorter },
                    descending: false
                });

                // ---- Set the selection for the ComboBox
                // oInputBox.setSelectedKey(undefined);
            }
        },

        onSetInputBoxDataWithSelection: function (oModel, component, mData, collection, key, txt, atxt, asorter, showAddText) {
            // ---- Set data to the Models
            oModel.setData({
                [collection]: mData.results
            });

            // ---- Create a Input Box binding
            var oItemTemplate = new sap.ui.core.ListItem();
            oItemTemplate.bindProperty("key", key);
            oItemTemplate.bindProperty("text", txt);

            if (showAddText) {
                oItemTemplate.bindProperty("additionalText", atxt);
            }

            var oInputBox = component;

            if (oInputBox !== null && oInputBox !== undefined) {
                oInputBox.setModel(oModel);

                oInputBox.bindObject({
                    path: "/" + collection,
                    template: oItemTemplate,
                    sorter: { path: asorter },
                    descending: false
                });

                // ---- Set the selection for the ComboBox
                if (mData.results.length > 0) {
                    for (var i = 0; i < mData.results.length; i++) {
                        var val = mData.results[i][param];

                        if (val === entry) {
                            oInputBox.setSelectedKey(i);
                            oInputBox.setSelectedItem(val);
                            oInputBox.setValue(val);
                        }
                    }
                } else {
                    oInputBox.setSelectedKey(undefined);
                }
            }
        },

        onDatePickerChange: function (oView, oEvent, param, msgText) {
            var msg = this.getResourceBundle().getText(msgText);
            var oModel = oView.getModel();

            if (oEvent !== null && oEvent !== undefined) {
                if (oEvent.getSource() !== null && oEvent.getSource() !== undefined) {
                    var datePicker = oEvent.getSource();
                    var sValue = oEvent.getParameter("value");
                    var bValid = oEvent.getParameter("valid");

                    if (!bValid) {
                        datePicker.setValueState(ValueState.Error);
                        datePicker.setValueStateText(msg);
                    } else {
                        datePicker.setValueState(ValueState.None);

                        oModel.setProperty("/" + param, sValue);
                    }
                }
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Helper Functions
        // --------------------------------------------------------------------------------------------------------------------

        onVisualizeModelData: function (thisExt, oView, sPath, oData, entity, entityId, fragmentFile, isExpanded, expandArray) {
            var xray = [];

            if (oData !== null && oData !== undefined) {
                // ---- Check for Model data o expand to child naviagtion targets
                if (isExpanded) {
                    xray = this.splitStringIntoArray(expandArray, ",");
                }

                this._openModelDataDialog(thisExt, oView, sPath, oData, entity, entityId, fragmentFile, xray, "");
            }
        },

        onVisualizeModelTableData: function (thisExt, oView, sPath, oData, entity, entityId, fragmentFile, isExpanded, expandArray) {
            var xray = [];

            if (oData !== null && oData !== undefined) {
                // ---- Check for Model data o expand to child naviagtion targets
                if (isExpanded) {
                    xray = this.splitStringIntoArray(expandArray, ",");
                }

                this._openModelDataDialog(thisExt, oView, sPath, oData, entity, entityId, fragmentFile, xray, "Table");
            }
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Dialog Functions
        // --------------------------------------------------------------------------------------------------------------------

        _openModelDataDialog: function (thisExt, oView, sPath, oData, entity, entityId, fragmentFile, expandArray, type) {
            var title = "Show Model data for EntitySet: [" + sPath + "]";
            var those = thisExt;
            var that = this;

            this.oModel = thisExt.getOwnerComponent().getModel();
            this.sPath = sPath;

            // ---- Starts the Value Help Dialog for Model Data
            if (!thisExt.getView().dialogModelData) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: fragmentFile,
                    controller: thisExt
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    oView.dialogModelData = oDialog;
                    oView.dialogModelData.removeAllContent();

                    // ---- Set the visual style for Model data
                    if (type === "Table") {
                        that._setModelTableData(oView.dialogModelData, oData, entity);
                    } else {
                        that._setModelData(oView, oData, entity, entityId, expandArray);
                    }

                    oView.dialogModelData.addStyleClass(those.getOwnerComponent().getContentDensityClass());
                    oView.dialogModelData.setTitle(title);
                    oView.dialogModelData.open();
                });
            } else {
                oView.dialogModelData.removeAllContent();

                // ---- Set the visual style for Model data
                if (type === "Table") {
                    this._setModelTableData(oView.dialogModelData, oData, entity);
                } else {
                    this._setModelData(oView, oData, entity, entityId, expandArray);
                }

                oView.dialogModelData.addStyleClass(those.getOwnerComponent().getContentDensityClass());
                oView.dialogModelData.setTitle(title);
                oView.dialogModelData.open();
            }
        },

        onCloseModelDialog: function (oEvent) {
            if (this.getView().dialogModelData) {
                this.getView().dialogModelData.close();
            }
        },

        _setModelData: function (oView, oData, entity, entityId, expandArray) {
            var oContent;
            var index = 1;

            var lblSubCaption = new sap.m.Label({ "text": "List of Model data:", "width": "340px", "design": "Bold" });

            var hboxCaption = new sap.m.HBox();
            hboxCaption.addItem(lblSubCaption);

            var vboxBlockHead = new sap.m.HBox();
            vboxBlockHead.addStyleClass("sapUiMediumMarginBegin sapUiMediumMarginTop sapUiMediumMarginEnd");
            vboxBlockHead.addItem(hboxCaption);

            oView.dialogModelData.addContent(vboxBlockHead);

            var xMData = this.oModel.oData[entity + "('" + entityId + "')"];

            // --------------------------------------------

            for (var property in oData) {
                if (oData.hasOwnProperty(property)) {
                    var txt1 = oData[property];
                    var txt2 = "";
                    var lbl = property;
                    var isO = this._isObject(txt1);

                    if (xMData !== null && xMData !== undefined) {
                        txt2 = xMData[property];
                    }

                    // --------------------------------------------

                    if (!isO) {
                        var vboxBlock = new sap.m.HBox();
                        vboxBlock.addStyleClass("sapUiMediumMarginBegin sapUiMediumMarginEnd");

                        var hboxBlock = new sap.m.HBox();

                        // --------------------------------------------
                        var lCounter = 0;

                        if (index < 10) {
                            lCounter = "0" + index;
                        } else {
                            lCounter = index;
                        }

                        var lblObject = new sap.m.Label({
                            "text": lCounter + ". " + lbl + ":",
                            "width": "340px"
                        });

                        lblObject.addStyleClass("sapUiTinyMarginTop");

                        // --------------------------------------------

                        var txtObject1 = new sap.m.TextArea({
                            "value": txt1,
                            "width": "280px",
                            "growing": false,
                            "rows": 1,
                            "enabled": false
                        });

                        txtObject1.addStyleClass("atosMInputBaseDisabled");

                        // --------------------------------------------

                        if (xMData !== null && xMData !== undefined) {
                            var txtObject2 = new sap.m.TextArea({
                                "value": txt2,
                                "width": "340px",
                                "growing": false,
                                "rows": 1,
                                "enabled": false
                            });

                            txtObject2.addStyleClass("atosMInputBaseDisabled");
                        }

                        // --------------------------------------------

                        hboxBlock.addItem(lblObject);
                        hboxBlock.addItem(txtObject1);

                        if (xMData !== null && xMData !== undefined) {
                            hboxBlock.addItem(txtObject2);
                        }

                        vboxBlock.addItem(hboxBlock);

                        // --------------------------------------------

                        oView.dialogModelData.addContent(vboxBlock);

                        // --------------------------------------------

                        // ---- Set new Counter values
                        index = index + 1;
                    }
                }
            }

            if (expandArray !== null & expandArray !== undefined && expandArray.length > -1) {
                for (var j = 0; j < expandArray.length; j++) {
                    var arrData = expandArray[j];

                    this._setSubModelData(oView, oData[arrData], arrData);
                }
            }
        },

        _setSubModelData: function (oView, oData, expandName) {
            var oContent;
            var index = 1;

            var lblDummy = new sap.m.Label({ "text": "", "width": "240px" });
            var lblSubCaption = new sap.m.Label({ "text": "Expanded to Sub Entity data:", "width": "240px", "design": "Bold" });
            var lblSubModelName = new sap.m.Label({ "text": expandName, "width": "240px", "design": "Bold" });

            var hboxBlock = new sap.m.HBox();
            hboxBlock.addItem(lblSubCaption);
            hboxBlock.addItem(lblSubModelName);
            hboxBlock.addItem(lblDummy);

            var vboxBlock = new sap.m.HBox();
            vboxBlock.addStyleClass("sapUiMediumMarginBegin sapUiMediumMarginTop sapUiMediumMarginEnd sapUiTinyMarginBottom");
            vboxBlock.addItem(hboxBlock);

            // --------------------------------------------

            oView.dialogModelData.addContent(vboxBlock);

            // --------------------------------------------

            for (var property in oData) {
                if (oData.hasOwnProperty(property)) {
                    var txt = oData[property];
                    var lbl = property;
                    var isO = this._isObject(txt);

                    // --------------------------------------------

                    if (!isO) {
                        var vboxBlock = new sap.m.HBox();
                        vboxBlock.addStyleClass("sapUiMediumMarginBegin sapUiMediumMarginEnd");

                        var hboxBlock = new sap.m.HBox();

                        // --------------------------------------------
                        var lCounter = 0;

                        if (index < 10) {
                            lCounter = "0" + index;
                        } else {
                            lCounter = index;
                        }

                        var lblDummy2 = new sap.m.Label({ "text": "", "width": "240px" });
                        var lblObject = new sap.m.Label({
                            "text": lCounter + ". " + lbl + ":",
                            "width": "240px"
                        });

                        lblObject.addStyleClass("sapUiTinyMarginTop");

                        // --------------------------------------------

                        var txtObject = new sap.m.TextArea({
                            "value": txt,
                            "width": "280px",
                            "growing": false,
                            "rows": 1,
                            "enabled": false
                        });

                        txtObject.addStyleClass("atosMInputBaseDisabled");

                        // --------------------------------------------

                        hboxBlock.addItem(lblDummy2);
                        hboxBlock.addItem(lblObject);
                        hboxBlock.addItem(txtObject);
                        vboxBlock.addItem(hboxBlock);

                        // --------------------------------------------

                        oView.dialogModelData.addContent(vboxBlock);

                        // --------------------------------------------

                        // ---- Set new Counter values
                        index = index + 1;
                    }
                }
            }

            var vboxBlock2 = new sap.m.HBox();
            vboxBlock2.addStyleClass("sapUiMediumMarginBegin sapUiMediumMarginBottom sapUiMediumMarginEnd");

            // --------------------------------------------

            oView.dialogModelData.addContent(vboxBlock2);
        },

        _setModelTableData: function (dialog, oData, entity) {
            var lblSubCaption = new sap.m.Label({ "text": "List of Model data:", "width": "340px", "design": "Bold" });
            var that = this;

            var oTable = this._createDynTable(dialog, oData, entity, lblSubCaption);

            dialog.addContent(oTable);

            setTimeout(function () {
                that.autoResizeColumns(oTable);
            }.bind(this), 800);
        },

        _createDynTable: function (dialog, oData, entity, lblSubCaption) {
            var oModel = this._getTableData(dialog, oData, entity);
            
            var oTable = new sap.ui.table.Table({
                title:                    lblSubCaption,
                selectionBehavior:        sap.ui.table.SelectionBehavior.Row,
                selectionMode:            sap.ui.table.SelectionMode.MultiToggle,
                enableColumnReordering:   false,
                showColumnVisibilityMenu: true,
                visibleRowCount:          15,
                threshold:                500,
                width:                    "auto"
            });

            oTable.addStyleClass("sapUiMediumMargin");

            oTable.setModel(oModel);

            oTable.bindColumns("/columns", function (sId, oContext) {
                var columnName = oContext.getObject().colName;
                var cWidth     = oContext.getObject().cWidth;

                return new sap.ui.table.Column({
                    label:    columnName,
                    template: columnName,
                    width:    cWidth
                });
            });

            oTable.bindRows("/rows");

            return oTable;
        },

        _getTableData: function (dialog, oData, entity) {
            // ---- Define the columns of the oTable
            var columnData = [
                { "colId": "Cnt", "colName": "Number",         "colVisibility": true, "colPosition": 0, "cWidth": "70px"  },
                { "colId": "Pna", "colName": "Property name",  "colVisibility": true, "colPosition": 1, "cWidth": "280px" },
                { "colId": "SLN", "colName": "SAP Label name", "colVisibility": true, "colPosition": 3, "cWidth": "380px" },
                { "colId": "Val", "colName": "Value",          "colVisibility": true, "colPosition": 2, "cWidth": "auto"  }
            ];

            var rowData = [];
            var index   = 1;

            for (var property in oData) {
                if (oData.hasOwnProperty(property)) {
                    var lblField  = "{" + entity + "/" + property + "/#@sap:label}";
                    var lblObject = new sap.m.Label({ "text":  lblField });
                    var txt = oData[property];
                    var isO = this._isObject(txt);
 
                    dialog.addContent(lblObject);

                    var lbl = lblObject.getProperty("text");

                    // --------------------------------------------

                    if (!isO) {
                        var lCounter = index;

                        var data = {
                            "Number":         lCounter,
                            "Property name":  property,
                            "SAP Label name": lbl,
                            "Value":          txt
                        };

                        rowData.push(data);

                        // ---- Set new Counter values
                        index = index + 1;
                    }

                    dialog.removeContent(lblObject);
                }
            }

            var oModel = new JSONModel();
                oModel.setData({
                    rows: rowData,
                    columns: columnData
                });

            return oModel;
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Message Functions
        // --------------------------------------------------------------------------------------------------------------------

        showMessageInfo: function (oInfo, oDetails) {
            sap.m.MessageBox.information(oInfo, {
                details: oDetails,
                actions: [sap.m.MessageBox.Action.OK],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            }
            );
        },

        showMessageWarning: function (oWarning, oDetails) {
            sap.m.MessageBox.warning(oWarning, {
                details: oDetails,
                actions: [sap.m.MessageBox.Action.OK],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            }
            );
        },

        showMessageSuccess: function (oSuccess, oDetails) {
            sap.m.MessageBox.success(oSuccess, {
                details: oDetails,
                actions: [sap.m.MessageBox.Action.OK],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            }
            );
        },

        showMessageError: function (oError, oDetails) {
            sap.m.MessageBox.error(oError, {
                details: oDetails,
                actions: [sap.m.MessageBox.Action.CLOSE],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            }
            );
        },

        alertMe: function (msg) {
            sap.m.MessageToast.show(msg, {
                duration: 3000,
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter,
                width: "20em",
                autoClose: true
            });
        },

        alertMeWidth: function (msg, boxw) {
            sap.m.MessageToast.show(msg, {
                duration: 3000,
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter,
                width: boxw,
                autoClose: true
            });
        },


        // --------------------------------------------------------------------------------------------------------------------
        // ---- Basic Functions
        // --------------------------------------------------------------------------------------------------------------------

        parseSecoundsToSpecialFormat: function (seconds, seperatorTime) {
            var sec_num = parseInt(seconds, 10);

            var days    = Math.floor(sec_num / 86400);
            var hours   = Math.floor((sec_num - (days * 86400)) / 3600);
            var minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60);

            if (days    < 10) {days    = "0"+days;}
            if (hours   < 10) {hours   = "0"+hours;}
            if (minutes < 10) {minutes = "0"+minutes;}

            var timeFormated = days + seperatorTime + hours + seperatorTime + minutes;

            return timeFormated;
        },

		autoResizeColumns: function (oTable) {
			var tcols = oTable.getColumns();

			// ---- Auto resize all automatic rendered columns from a UI Table
			for (var index in tcols) {
				if (tcols.hasOwnProperty(index)) {
					oTable.autoResizeColumn(index);
				}
			}

			// ---- Auto resize the first columns from a UI Table
			oTable.autoResizeColumn(0);
		},

        getUriParameters: function (prop) {
            var uriCheck = false;

            if (jQuery.sap.getUriParameters() !== null && jQuery.sap.getUriParameters() !== undefined &&
                jQuery.sap.getUriParameters().mParams !== null && jQuery.sap.getUriParameters().mParams !== undefined) {

                var param = jQuery.sap.getUriParameters().mParams;

                // ---- Set Test Flags over Url parameter
                if (param[prop] !== null && param[prop] !== undefined && param[prop].length > 0) {
                    if (param[prop][0] === "true") {
                        uriCheck = true;
                    } else {
                        uriCheck = false;
                    }
                }
            }

            return uriCheck;
        },

        getUriParameterCType: function (prop) {
            var uriCheck = "";

            if (jQuery.sap.getUriParameters() !== null && jQuery.sap.getUriParameters() !== undefined &&
                jQuery.sap.getUriParameters().mParams !== null && jQuery.sap.getUriParameters().mParams !== undefined) {

                var param = jQuery.sap.getUriParameters().mParams;

                // ---- Set Test Flags over Url parameter
                if (param[prop] !== null && param[prop] !== undefined && param[prop].length > 0) {
                    if (param[prop][0] !== "") {
                        uriCheck = param[prop][0];
                    }
                }
            }

            return uriCheck;
        },

        removeArrayData: function (oView, data) {
            var oModel = oView.getModel();

            if (data !== null && data !== undefined && data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    let param = data[i];

                    oModel.setProperty("/" + param, "");
                }
            }
        },

        splitStringIntoArray: function (seperatorText, seperator) {
            var ResultArray = null;

            if (seperatorText !== null) {
                var SplitChars = seperator;

                if (seperatorText.indexOf(SplitChars) >= 0) {
                    ResultArray = seperatorText.split(SplitChars);
                }
            }

            return ResultArray;
        },

        checkForDataMatrixArray: function (sScanNumber) {
            // ---- Check for Data Matix Code "0321225900'01'000010'        '2304000002'000000000145"
            var sDataMatrixSeperator = this.getResourceBundle().getText("DataMatrixSeperator");
            var sDataMatrixLePLace   = parseInt(this.getResourceBundle().getText("DataMatrixLePLace"), 10);
            var sScanDataMatrixNo = "";
            var check = false;

            var aArray = this.splitStringIntoArray(sScanNumber, sDataMatrixSeperator);

            if (aArray !== null && aArray !== undefined && aArray.length > 0) {
                sScanDataMatrixNo = aArray[sDataMatrixLePLace];
                check = true;
            } else {
                sScanDataMatrixNo = sScanNumber;
            }

            return [check, sScanDataMatrixNo];
        },

        getResourceBundle: function (ownerComponent) {
            return this.OwnerComponent.getModel("i18n").getResourceBundle();
        },

        _parseXmlToJson: function (xml) {
            // ---- Changes XML to JSON
            var that = this;
            var obj = {};

            if (xml.nodeType == 1) {
                // ---- Element
                // ---- Do attributes
                if (xml.attributes.length > 0) {
                    obj["@attributes"] = {};

                    for (var j = 0; j < xml.attributes.length; j++) {
                        var attribute = xml.attributes.item(j);

                        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                    }
                }
            } else if (xml.nodeType == 3) {
                // ---- Text
                obj = xml.nodeValue;
            }

            // ---- Do children
            // ---- If all text nodes inside, get concatenated text from them.
            var textNodes = [].slice.call(xml.childNodes).filter(function (node) {
                return node.nodeType === 3;
            });

            if (xml.hasChildNodes() && xml.childNodes.length === textNodes.length) {
                obj = [].slice.call(xml.childNodes).reduce(function (text, node) {
                    return text + node.nodeValue;
                }, "");
            } else if (xml.hasChildNodes()) {
                for (var i = 0; i < xml.childNodes.length; i++) {
                    var item = xml.childNodes.item(i);
                    var nodeName = item.nodeName;

                    if (typeof obj[nodeName] == "undefined") {
                        obj[nodeName] = that._parseXmlToJson(item);
                    } else {
                        if (typeof obj[nodeName].push == "undefined") {
                            var old = obj[nodeName];

                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }

                        obj[nodeName].push(that._parseXmlToJson(item));
                    }
                }
            }

            return obj;
        },

        _isNumeric: function (num) {
            if (typeof (num) === "number" && !isNaN(num)) {
                return true;
            } else if (typeof (num) === "string" && isNaN(num)) {
                return false;
            } else if (num.trim() === undefined && num.trim() === "") {
                return false;
            } else {
                return false;
            }
        },

        _isObject: function (obj) {
            return obj instanceof Object && obj.constructor === Object;
        }


        // --------------------------------------------------------------------------------------------------------------------
        // ---- End
        // --------------------------------------------------------------------------------------------------------------------

    };
});