// Requires: rdf/rdfds.js
//           rdf/rdf.js
//           scan.js
//           fuzzy.js
//           refresh.js
//           opentopwin.js
//           updatescanoverlay.js
var numChanges;
var refresh;
var scan;

function loadUpdateScan()
{
    var rdffile;

    // Connect to the RDF file
    rdffile = getRDFuri();
    initRDF(rdffile);

    // link to the listbox
    var tree=document.getElementById("UpdateTree");
    tree.datasources=rdffile;
    tree.ondblclick=treeDblClick;
    refreshTree();

    // Check for refresh requests
    refresh = new Refresher("refreshTreeRequest", refreshTree);
    refresh.start();
}

function unloadUpdateScan()
{
    refresh.stop();
}

function treeDblClick(event)
{
    switch (event.button) {
    case 0:
	diffSelectedItem();
	break;
    case 1:
	openSelectedItemNewTab();
	break;
    }
}

function scanButtonClick()
{
    var id;
    var numitems;
    var treeEmptyAlert=document.getElementById("strings").getString(
	                                       "treeEmptyAlert");
    var statusScanning=document.getElementById("strings").getString(
                                               "statusScanning");
    showStopButton();
    
    var tree = document.getElementById("UpdateTree");

    try {
        numitems = tree.contentView.rowCount;
    } catch(e) {
        numitems = 0;
    }

    if (numitems > 0)
    {
	scan = new Scanner()
        
        for (var i=0; i<numitems; i++)
        {
            id = tree.contentView.getItemAtIndex(i).id;
            scan.addURL(id, queryRDFitem(id, "title", "No Title"), 
			queryRDFitem(id, "url", ""), 
			queryRDFitem(id, "content", ""), 
			queryRDFitem(id, "threshold", 100));
        }

        setStatus(statusScanning);
	numChanges=0;
        scan.start(scanChangedCallback, scanFinishedCallback, showProgress);
    }
    else
    {
        scanFinishedCallback(treeEmptyAlert);
    }

}

function scanChangedCallback(id, new_content, status)
{
    if (status == STATUS_CHANGE) {
	numChanges++;
	if (queryRDFitem(id, "changed") == "0") {
            // If this is a new change, save the previous state for diffing
	    old_content = queryRDFitem(id, "content", "");
	    modifyRDFitem(id, "old_content", old_content);
	}

	modifyRDFitem(id, "changed", "1");
	modifyRDFitem(id, "content", new_content);
	modifyRDFitem(id, "error", "0");
    } else if (status == STATUS_NO_CHANGE) {
	modifyRDFitem(id, "error", "0");
    } else if (status == STATUS_NEW) {
	modifyRDFitem(id, "content", new_content);
	modifyRDFitem(id, "error", "0");
    } else {
	modifyRDFitem(id, "error", "1");
    }
    saveRDF();
    refreshTree();
    refresh.request();
}

function scanFinishedCallback(errors)
{
    var statusError=document.getElementById("strings").getString(
	                                    "statusError");
    var statusNoChanges=document.getElementById("strings").getString(
	                                        "statusNoChanges");
    var statusOneChange=document.getElementById("strings").getString(
	                                        "statusOneChange");
    var statusManyChanges=document.getElementById("strings").getString(
	                                          "statusManyChanges");

    if (errors != "") {
	setStatus(statusError);
        alert(errors);
    } else if (numChanges == 0) {
	setStatus(statusNoChanges);
    } else {
	if (numChanges == 1) {
	    setStatus(statusOneChange);
	    message = "A webpage has been updated";
	} else {
	    setStatus(numChanges+" "+statusManyChanges);
	    message = numChanges+" webpages have been updated";
	}
	window.openDialog("chrome://updatescan/content/alert.xul",
			  "alert:alert",
			  "chrome,dialog=yes,titlebar=no,popup=yes",
			  message);
    }
    hideProgress();
    showScanButton();
}

function stopButtonClick()
{
    var statusCancel=document.getElementById("strings").getString(
	                                     "statusCancel");
    if (scan != null) {
	scan.cancel();
    }
    showScanButton();
    setStatus(statusCancel);
}

function openNewDialog()
{
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow) 

    addToUpdateScan(mainWindow.document.getElementById('content'))
    refreshTree();
    refresh.request();
}

function openNewDialogNoRefresh(title, url)
{
    var id;
    var result = new Array(8);
    result[0] = url;
    result[1] = title;
    result[2] = "100";     // threshold = 100 by default
    result[3] = "";        // lastscan not defined by default
    result[4] = "0";       // changed = 0 by default
    result[5] = "**NEW**"; // content flagged as new
    result[6] = "0";       // error = 0 by default
    result[7] = "60";      // scan once an hour by default

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 'dlgNew', 
                      'chrome,dialog,modal,centrescreen', '', 
		      result);
    if (result[0] != null) {
	id = addRDFitem();
        modifyRDFitem(id, "url", result[0]);
        modifyRDFitem(id, "title", result[1]);
        modifyRDFitem(id, "threshold", result[2]);
        modifyRDFitem(id, "lastscan", result[3]);
        modifyRDFitem(id, "changed", result[4]);
        modifyRDFitem(id, "content", result[5]);
	modifyRDFitem(id, "error", result[6]);
	modifyRDFitem(id, "scanratemins", result[7]);
	saveRDF();
    }
}

function openEditDialog()
{
    var titleEditItem=document.getElementById("strings").getString(
	                                     "titleEditItem");
    var result = new Array(8);
    var id;
    var oldurl;
    
    id=getSelectedItemID(); 
    result[0] = queryRDFitem(id, "url", "");
    result[1] = queryRDFitem(id, "title", "No Title");
    result[2] = queryRDFitem(id, "threshold", "100");
    result[3] = "";        // lastscan not defined by default
    result[4] = "0";       // changed = 0 by default
    result[5] = "**NEW**"; // content flagged as new
    result[6] = "0";       // error = 0 by default
    result[7] = queryRDFitem(id, "scanratemins", "0"); 

    oldurl = result[0];

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 
		      'dlgEdit', 
                      'chrome,dialog,modal,centrescreen', 
		      titleEditItem, 
		      result);
    if (result[0] != null) {
        if (oldurl == result[0]) { // URL not changed - don't reset changes
            modifyRDFitem(id, "title", result[1]);
	    modifyRDFitem(id, "threshold", result[2]);
	    modifyRDFitem(id, "scanratemins", result[7]);
        } else {
            modifyRDFitem(id, "url", result[0]);
            modifyRDFitem(id, "title", result[1]);
            modifyRDFitem(id, "threshold", result[2]);
            modifyRDFitem(id, "lastscan", result[3]);
            modifyRDFitem(id, "changed", result[4]);
            modifyRDFitem(id, "content", result[5]);
	    modifyRDFitem(id, "error", result[6]);
	    modifyRDFitem(id, "scanratemins", result[7]);
        }
	saveRDF();
    }
    refreshTree();
    refresh.request();
}

function openSelectedItem()
{
    var id;
    id = getSelectedItemID();
    modifyRDFitem(id, "changed", "0");
    saveRDF();
    openTopWin(queryRDFitem(id, "url"));
    refreshTree();
    refresh.request();
}

function diffSelectedItem()
{
    var id;
    id = getSelectedItemID();
    modifyRDFitem(id, "changed", "0");
    saveRDF();

    displayDiffs(queryRDFitem(id, "title", "No Title"), queryRDFitem(id, "url", ""), 
                 queryRDFitem(id, "old_content", ""), queryRDFitem(id, "content", ""));

    refreshTree();
    refresh.request();
}
function openSelectedItemNewTab()
{
    var mainWindow = window.QueryInterface(
	Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIWebNavigation)
    .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
    .rootTreeItem
    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindow);

    var id;
    id = getSelectedItemID();
    modifyRDFitem(id, "changed", "0");
    saveRDF();
    mainWindow.getBrowser().addTab(queryRDFitem(id, "url"));
    refreshTree();
    refresh.request();
}

function markAllAsVisited()
{
    var tree = document.getElementById("UpdateTree");

    try {
        numitems = tree.contentView.rowCount;
    } catch(e) {
        numitems = 0;
    }

    if (numitems > 0)
    {
        for (var i=0; i<numitems; i++)
        {
            id = tree.contentView.getItemAtIndex(i).id;

	    if (queryRDFitem(id, "changed") != "0") {
		modifyRDFitem(id, "changed", "0");
		refreshTree();
	    }
        }
	saveRDF();
	refreshTree();
	refresh.request();
    }
}

function deleteSelectedItem()
{
    id=getSelectedItemID(); 
    title = queryRDFitem(id, "title", "untitled");

    if (confirm("Are you sure you want to delete "+title+"?")) {
	deleteRDFitem(id);
	saveRDF();
	refreshTree();
	refresh.request();
    }
}

function getSelectedItemID()
{
    var tree = document.getElementById("UpdateTree");
    return tree.contentView.getItemAtIndex(tree.currentIndex).id;
}

function showStopButton()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("stopbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("stopbuttoncommand"));
}

function showScanButton()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("scanbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("scanbuttoncommand"));
}

function refreshTree()
{
//    myDump("refresh");
    var tree=document.getElementById("UpdateTree");
    tree.builder.rebuild();    
}

function setStatus(status)
{
    document.getElementById("StatusText").value = status;
}

function showProgress(value, max)
{
    var progress = document.getElementById("Progress");
    progress.collapsed = false;
    progress.value = 100*value/max;
}

function hideProgress()
{   
    document.getElementById("Progress").collapsed=true;
}
