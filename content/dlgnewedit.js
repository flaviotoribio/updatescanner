/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

UpdateScanner.DlgNewEdit = {

ksliderThresholdValues : 5,
ksliderAutoscanValues : 7,

initDialog : function()
{
    var args = window.arguments[0];
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
    prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch("extensions.updatescan.");

    document.title = "Update Scanner";
    document.getElementById("txtTitle").value = args.title;
    document.getElementById("txtURL").value = args.url;

    var useSliders = prefBranch.getBoolPref("scan.useSliders");
    document.getElementById("groupboxAutoscanSlider").hidden = !useSliders;
    document.getElementById("groupboxThresholdSlider").hidden = !useSliders;
    document.getElementById("groupboxAutoscanNumbers").hidden = useSliders;
    document.getElementById("groupboxThresholdNumbers").hidden = useSliders;


    if (useSliders) {
        document.getElementById("sliderThreshold").max = this.ksliderThresholdValues;
        this.sliderThresholdSetPos(this.sliderThresholdEncode(args.threshold));
        this.sliderThresholdChange();

        document.getElementById("sliderAutoscan").max = this.ksliderAutoscanValues;
        this.sliderAutoscanSetPos(this.sliderAutoscanEncode(args.scanRateMins));
        this.sliderAutoscanChange();
    } else {
        document.getElementById("textThreshold").value = args.threshold;

        if (args.scanRateMins == 0) { // Manual scan selected
            document.getElementById("manualScan").selectedIndex = 0;
            args.scanRateMins = 60; // Default to 1 hour
        } else {
            document.getElementById("manualScan").selectedIndex = 1;
            if (args.scanRateMins < 5) {
                args.scanRateMins = 5;
            }
        }

        if (args.scanRateMins % (60*24) == 0) {
            document.getElementById("textAutoscan").value = args.scanRateMins/(60*24);
            document.getElementById("menuAutoscanUnit").value = "Days";
        } else if (args.scanRateMins % 60 == 0) {
            document.getElementById("textAutoscan").value = args.scanRateMins/60;
            document.getElementById("menuAutoscanUnit").value = "Hours";
        } else {
            document.getElementById("textAutoscan").value = args.scanRateMins;
            document.getElementById("menuAutoscanUnit").value = "Minutes";
        }
    }

    document.getElementById("ignoreNumbers").checked = args.ignoreNumbers;
    document.getElementById("ignoreNumbers2").checked = args.ignoreNumbers;

    if (args.requestMethod == "get") {
        document.getElementById("requestMethod")
                .selectedIndex = 0;
    } else {
        document.getElementById("requestMethod")
                .selectedIndex = 1;
        document.getElementById("postParams").value = args.postParams;
    }

    if (args.encoding == "auto") {
        document.getElementById("autoCharEncoding")
                .selectedIndex = 0;
    } else {
        document.getElementById("autoCharEncoding")
                .selectedIndex = 1;
        document.getElementById("encodingText").value = args.encoding;
    }

    UpdateScanner.DlgNewEdit.charEncodingChanged();

    var advSection = document.getElementById("advSection");
    var advLabel = document.getElementById("advLabel");

    if (args.advanced) {
        advSection.hidden = false;
        advLabel.hidden = true;
    }

    document.getElementById("highlightChanges").checked = args.highlightChanges;
    document.getElementById("highlightColour").color = args.highlightColour;
    document.getElementById("markChanges").checked = args.markChanges;

    this.highlightChangesChanged();
},

Ok : function()
{
    var args = window.arguments[0];
    var scanrate;
    var txtURL=document.getElementById("txtURL");
    var txtTitle=document.getElementById("txtTitle");
    var noDataAlert=document.getElementById("USc_strings").getString(
                                            "noDataAlert");
    var fiveMinuteAlert=document.getElementById("USc_strings").getString(
                        "shortScanAlert");
    var httpexists = /^[A-Za-z]+:\/\//;
    var restexists = /^[A-Za-z]+:\/\/\W*\w/;
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
    prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch("extensions.updatescan.");
    var ignoreNumbers;

    if (!httpexists.test(txtURL.value.toLowerCase())) {
        txtURL.value="http://" + txtURL.value;
    }
    if (txtTitle.value == "" || !restexists.test(txtURL.value))
    {
        alert(noDataAlert);
        return false;
    }

    args.title = txtTitle.value;
    args.url = txtURL.value;
    if (prefBranch.getBoolPref("scan.useSliders")) {
             args.threshold = this.sliderThresholdDecode(this.sliderThresholdGetPos());
             args.scanRateMins = this.sliderAutoscanDecode(this.sliderAutoscanGetPos());
        if (document.getElementById("ignoreNumbers").checked) {
            args.ignoreNumbers = true;
        } else {
            args.ignoreNumbers = false;
        }
    } else {
        args.threshold = document.getElementById("textThreshold").value;

        if (document.getElementById("manualScan").selectedIndex == 0) {
            args.scanRateMins = 0; // Manual scan
        } else {
            args.scanRateMins = document.getElementById("textAutoscan").value;
            if (document.getElementById("menuAutoscanUnit").value == "Hours") {
                args.scanRateMins = args.scanRateMins * 60;
            } else if (document.getElementById("menuAutoscanUnit").value == "Days") {
                args.scanRateMins = args.scanRateMins * 60 * 24;
            }
            if (args.scanRateMins < 5) {
                args.scanRateMins = 5;
            }
        }
        if (document.getElementById("ignoreNumbers2").checked) {
            args.ignoreNumbers = true;
        } else {
            args.ignoreNumbers = false;
        }
    }

    if (args.scanRateMins > 0 && args.scanRateMins < 15 &&
        prefBranch.getBoolPref("scan.warnScanShort")) {
        if (!confirm(fiveMinuteAlert)) {
            return false;
        }
    }

    if (document.getElementById("requestMethod").selectedIndex == 0) {
        args.requestMethod = "get";
        args.postParams = "";
    } else {
        args.requestMethod = "post";
        args.postParams = document.getElementById("postParams").value;
    }

    if (document.getElementById("autoCharEncoding").selectedIndex == 0) {
        args.encoding = "auto";
    } else {
        args.encoding = document.getElementById("encodingText").value;
    }

    args.highlightChanges = document.getElementById("highlightChanges").checked;
    args.highlightColour = document.getElementById("highlightColour").color;
    args.markChanges = document.getElementById("markChanges").checked;

    args.ok = true;
    return true;
},

Cancel : function()
{
    window.arguments[0].ok = false;
    return true;
},

advancedClick : function()
{
    var advLabel = document.getElementById("advLabel");
    var advSection = document.getElementById("advSection");

    advLabel.hidden = true;
    advSection.hidden = false;

    window.sizeToContent();
},

manualScanChanged : function()
{
    var manualScan = (document.getElementById("manualScan").selectedIndex == 0);
    document.getElementById("textAutoscan").disabled = manualScan;
    document.getElementById("menuAutoscanUnit").disabled = manualScan;
},

sliderThresholdGetPos : function()
{
    var slider=document.getElementById("sliderThreshold");
    return slider.value;
},

sliderThresholdSetPos : function(value)
{
    var slider=document.getElementById("sliderThreshold");
    slider.value = value;
},

sliderThresholdChange : function()
{
    var strings=document.getElementById("USc_strings");
    var label1=document.getElementById("label1");
    var label2=document.getElementById("label2");

    var pos = this.sliderThresholdGetPos();
    if (pos == 0) {
        label1.value=strings.getString("thresholdLabel0a");
        label2.value="";
    } else if (pos == 1) {
        label1.value=strings.getString("thresholdLabel1a");
        label2.value=strings.getString("thresholdLabel1b");
    } else if (pos == 2) {
        label1.value=strings.getString("thresholdLabel2a");
        label2.value=strings.getString("thresholdLabel2b");
    } else if (pos == 3) {
        label1.value=strings.getString("thresholdLabel3a");
        label2.value=strings.getString("thresholdLabel3b");
    } else if (pos == 4) {
        label1.value=strings.getString("thresholdLabel4a");
        label2.value=strings.getString("thresholdLabel4b");
    } else if (pos == 5) {
        label1.value=strings.getString("thresholdLabel5a");
        label2.value=strings.getString("thresholdLabel5b");
    }
},

sliderThresholdEncode : function(threshold)
{
    if (threshold < 5)
        return 0;
    if (threshold < 30)
        return 1;
    if (threshold < 75)
        return 2;
    if (threshold < 300)
        return 3;
    if (threshold < 750)
        return 4;
    return 5;
},

sliderThresholdDecode : function(slider)
{
    if (slider == 0)
        return 0;
    if (slider == 1)
        return 10;
    if (slider == 2)
        return 50;
    if (slider == 3)
        return 100;
    if (slider == 4)
        return 500;
    return 1000;
},

sliderAutoscanGetPos : function()
{
    var slider=document.getElementById("sliderAutoscan");
    return slider.value;
},

sliderAutoscanSetPos : function(value)
{
    var slider=document.getElementById("sliderAutoscan");
    slider.value = value;
},

sliderAutoscanChange : function()
{
    var strings=document.getElementById("USc_strings");
    var label3=document.getElementById("label3");

    var pos = this.sliderAutoscanGetPos();
    if (pos == 0) {
        label3.value=strings.getString("autoscanLabel0a");
    } else if (pos == 1) {
        label3.value=strings.getString("autoscanLabel1a");
    } else if (pos == 2) {
        label3.value=strings.getString("autoscanLabel2a");
    } else if (pos == 3) {
        label3.value=strings.getString("autoscanLabel3a");
    } else if (pos == 4) {
        label3.value=strings.getString("autoscanLabel4a");
    } else if (pos == 5) {
        label3.value=strings.getString("autoscanLabel5a");
    } else if (pos == 6) {
        label3.value=strings.getString("autoscanLabelWeekly");
    } else if (pos == 7) {
        label3.value=strings.getString("autoscanLabel6a");
    }
},

sliderAutoscanEncode : function(scanratemins)
{
    if (scanratemins == 0)      // Manual
        return 7;
    if (scanratemins < 10)
        return 0;
    if (scanratemins < 20)
        return 1;
    if (scanratemins < 45)
        return 2;
    if (scanratemins < 60 * 3)
        return 3;
    if (scanratemins < 60 * 12)
        return 4;
    if (scanratemins < 60 * 24 * 4)
        return 5;
    else
        return 6;
},

sliderAutoscanDecode : function(slider)
{
    if (slider == 0)
        return 5;        // 5 minutes
    if (slider == 1)
        return 15;       // 15 minutes
    if (slider == 2)
        return 30;       // 30 minutes
    if (slider == 3)
        return 60;       // Hourly
    if (slider == 4)
        return 60 * 6;   // 6 Hours
    if (slider == 5)
        return 60 * 24;  // Daily
    if (slider == 6)
        return 60 * 24 * 7;  // Weekly
    else
        return 0;        // Manual
},

highlightChangesChanged : function()
{
    var enabled = document.getElementById("highlightChanges");
    document.getElementById("highlightColour").disabled = !enabled.checked;
    document.getElementById("markChanges").disabled = !enabled.checked;
},

requestMethodChanged : function()
{
    var method=document.getElementById("requestMethod");
    var postParams = document.getElementById("postParams");
    if  (method.selectedIndex == 1) {
        postParams.disabled = false;
    } else {
        postParams.disabled = true;
    }
},

charEncodingChanged : function()
{
    var auto=document.getElementById("autoCharEncoding");
    var encodingText = document.getElementById("encodingText");
    if  (auto.selectedIndex == 1) {
        encodingText.disabled = false;
    } else {
        encodingText.disabled = true;
    }
},
};
