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


sap.ui.define(["sap/ui/core/format/NumberFormat"], function(NumberFormat) {

	"use strict";

	var oFloatNumberFormat = NumberFormat.getFloatInstance(
		{
			maxFractionDigits: 5,
			minFractionDigits: 0,
			groupingEnabled: false,
		},

		sap.m.getLocale()
	);

	return {

		switchFormatter: function (aValue) {
			var status = false;

			if (aValue !== null && aValue !== undefined && aValue === "217_1") {
				status = true;
			}

			return status;
		},

		formatFloatLocal: function (sFloat) {
			return oFloatNumberFormat.format(parseFloat(sFloat));
		},

		getTitle: function (sText, sMode) {
			return sMode === 'Multi' ? sText + ' Multiple formats' : sText + ' ' + sMode;
		},

		formatThumbnailUrl: function (mediaType) {
			var iconUrl;

			switch (mediaType) {
				case "image/png":
					iconUrl = "sap-icon://card";
					break;
				case "text/plain":
					iconUrl = "sap-icon://document-text";
					break;
				case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
					iconUrl = "sap-icon://excel-attachment";
					break;
				case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
					iconUrl = "sap-icon://doc-attachment";
					break;
				case "application/pdf":
					iconUrl = "sap-icon://pdf-attachment";
					break;
				default:
					iconUrl = "sap-icon://attachment";
			}

			return iconUrl;
		},

		numberInput: function (sValue) {
			var numberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
				"groupingEnabled": true,  // grouping is enabled
				"groupingSeparator": '.', // grouping separator is '.'
				"groupingSize": 3,        // the amount of digits to be grouped (here: thousand)
				"decimalSeparator": ",",  // the decimal separator must be different from the grouping separator
				"maxFractionDigits": 2,
				"minFractionDigits": 2
			});
			var nval = "0,00";

			sap.ui.getCore().getConfiguration().setFormatLocale("de_DE");
			sap.ui.getCore().getConfiguration().getFormatSettings().setLegacyNumberFormat("X");

			if (sValue !== null && sValue !== undefined && sValue !== "") {
				nval = oFloatNumberFormat.format(sValue);
			}

			return nval;
		},

		upperEmailAdr: function (sValue) {
			var text = "";

			if (sValue !== null && sValue !== undefined && sValue !== "") {
				text = sValue.toUpperCase();
			}

			return text;
		},

		lowerEmailAdr: function (sValue) {
			var text = "";

			if (sValue !== null && sValue !== undefined && sValue !== "") {
				text = sValue.toLowerCase();
			}

			return text;
		},

		modFormatter: function (aValue) {
			var modified = "";

			if (aValue !== null && aValue !== undefined) {
				if (aValue === "true") {
					modified = "Yes";
				} else {
					modified = "No";
				}
			}

			return modified;
		},

		colorTooltipExtLicStatus: function (aValue) {
			switch (aValue) {
				case "green":
					return "Already Imported";
				case "grey":
					return "Not Yet Imported";
				case "yellow":
					return "To Be Imported";
				case "red":
					return "Error While Import";
				default:
					return "";
			}
		},

		colorSetInactive: function (type, aValue) {
			var inactive = "None";

			if (type !== null && type !== undefined) {
				if (type === "System" || type === "Workplace") {
					if (aValue === "inactive") {
						inactive = "Error";
					}
				}
			}

			return inactive;
		},

		colorSelectedStatus: function (aValue) {
			var status = "";

			if (aValue) {
				status = aValue;
			} else {
				status = "None";
			}

			return status;
		},

		colorExtLicStatus: function (aValue) {
			var color = "black";

			if (aValue !== null && aValue !== undefined) {
				color = aValue;
			}

			return color;
		},

		shortDate: function (oValue) {
			if (oValue) {
				return sap.ui.core.format.DateFormat.getDateTimeInstance({
					style: "short"
				}).format(oValue);
			} else {
				return "";
			}
		},

		dateFormatterWithoutUTC: function (envy, utc) { //eslint-disable-line 
			jQuery.sap.require("sap.ui.core.format.DateFormat");

			if (envy) {
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "yyyy-MM-ddTHH:mm:ss"
				});

				var nDate = new Date(envy);

				return oDateFormat.format(nDate);
			}
		},

		dateFormatterGeneric: function (envy, pattern) { //eslint-disable-line 
			jQuery.sap.require("sap.ui.core.format.DateFormat");

			if (envy) {
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: pattern
				});

				var nDate = new Date(envy);

				return oDateFormat.format(nDate);
			}
		},

		dateFormatter: function (envy) { //eslint-disable-line
			jQuery.sap.require("sap.ui.core.format.DateFormat");

			if (envy) {
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd.MM.yyyy, HH:mm"
				});

				var nDate = new Date(envy);

				return oDateFormat.format(nDate);
			}
		},

		formatSenderName: function (sFirstName, sLastName) {
			return sLastName + ", " + sFirstName;
		},

		formatAttribute: function (sValue) {
			if (jQuery.isNumeric(sValue)) {
				return sap.ui.core.format.FileSizeFormatFileSizeFormat.getInstance({
					binaryFilesize: false,
					maxFractionDigits: 1,
					maxIntegerDigits: 3
				}).format(sValue);
			} else {
				return sValue;
			}
		},

		currencyValue: function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		}

	};
});