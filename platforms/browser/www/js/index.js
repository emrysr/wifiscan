var app = {
    /**
     * DATA
     */
    scan_retries: 0,
    max_retries: 4,
    scan_counter: 0,
    redraw_counter: 0,
    accessPoints: [],
    currentSSID: '',
    repeat_seconds: 20,
    isWifiEnabled: false,
    log_history: [],
    max_history: 400,
    online: false,
    /**
     * wait for device to be ready
     */
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    
    /**
     * runs once cordova triggers the `deviceready` event
     */
    onDeviceReady: function() {
        app.trace();
        
        this.getWifiEnabled().then(state=>app.showWifiConnected(state));
        this.getConnectedSSID();
        this.showIpAddress();
        this.getWifiScanResults();

        document.addEventListener('reload', this.reload, false);
        document.addEventListener('connect', this.connect, false);
        document.addEventListener("offline", ()=>{app.online=false; app.showWifiNetworks()}, false);
        document.addEventListener("online", ()=>{app.online=true; app.showWifiNetworks()}, false);
        
        // handle all clicks on document
        document.addEventListener('click', function (event) {
            var parent_list_item = getClosest(event.target, '.list_item');
            // app.log(event.target);
            if (event.target.classList.contains('reload-button')) {
                event.preventDefault();
                document.dispatchEvent(new CustomEvent('reload'));
            } else if (event.target.classList.contains('list_item') || parent_list_item) {
                event.preventDefault();
                var hash = (parent_list_item && parent_list_item.hash) ? parent_list_item.hash: event.target.hash;
                document.dispatchEvent(new CustomEvent('connect', {detail: hash}));
            } else {
                // no matches. carry on as normal..
            }
        }, false);


        // check which wifi network we're on every 5s
        setInterval(function(){
            app.getConnectedSSID().then(app.showWifiNetworks());
        }, 5000);

    },
    /**
     * returns promise with bool as parameter in sucessful then()
     */
    getWifiEnabled: function() {
        return WifiWizard2.isWifiEnabled();
    },
    showWifiConnected: function(state) {
        if (typeof state !== "undefined") app.online = state;
        app.info(app.online ? "WiFi is enabled": "WiFi is not available")
        document.body.classList.toggle('online', app.online);
    },
    /**
     * get the list of access points
     * store results in `app.accessPoints`
     * on error retry after short delay
     */
    getWifiScanResults: function() {
        app.trace();

        app.hideReload();
        this.scan()
            .then(function() {
                app.showWifiNetworks();
                app.scan_counter++;
                app.scan_retries = 0;
                app.log(`Scan ${app.scan_counter} complete. (${app.accessPoints.length} items)`);
                
                // re-scan after delay
                WifiWizard2.timeout(app.repeat_seconds*1000).then(function() {
                    app.getWifiScanResults();
                });
            })
            .catch(function(reason){ 
                // error running scan. clear auto refresh, wait and retry
                app.error(app.scan_retries + ". " + reason);
                WifiWizard2.timeout(2000).then(function(){
                    app.scan_retries++;
                    if (app.scan_retries > app.max_retries) {
                        app.log("");
                        app.info("Failed to scan. ;(");
                        app.error("============ CLICK FIND TO RESTART");
                        app.scan_retries = 0;
                        app.showReload();
                        return;
                    } else {
                        app.info("Restarting scan " + app.scan_counter++)
                        app.getWifiScanResults();
                    }
                });
            });
    },
    /**
     * display the list of networks to choose from
     * items in list are selectable to enable changing wifi connection
     */
    showWifiNetworks: function() {
        app.trace();
        app.redraw_counter++;
        app.log(`${app.redraw_counter}. Re-drawing list (${app.accessPoints.length} items)`);

        const list = document.getElementById("list");
        const list_item = document.createElement("a");
        list.innerHTML = '';
        // TODO: update values not re-rendering whole list.
        
        // format data as list item for each entry
        app.accessPoints.forEach((ap, index) => {
            var item = list_item.cloneNode();
            var wps = ap.capabilities.match('WPS') ? ' WPS': '';
            var strength = "Unusable";
            var rating = 1;
            if(ap.level > -81) {
                strength = "Not Good";
                rating = 2;
            }
            if(ap.level > -71) {
                strength = "Okay";
                rating = 3;
            }
            if(ap.level > -67) {
                strength = "Very Good";
                rating = 4;
            }
            if(ap.level > -30) {
                strength = "Amazing";
                rating = 5;
            }
            var title = ap.SSID === "" ? `<span class="text-muted">${ap.BSSID}</span>`: ap.SSID;
            if (ap.SSID !== "") item.href = "#" + ap.SSID;
            item.classList.add('list_item');
            item.classList.toggle('active', ap.SSID === app.currentSSID);
            
            item.innerHTML = `<span>${title}<small class="badge text-muted">${wps}</small></span>
                              <progress max="5" value="${rating}">
                                  ${ap.level}dBm
                              </progress>`;
            list.append(item);
        });
    },

    showIpAddress: function() {
        const container = document.getElementById("ip-address");
        WifiWizard2.getWifiIP()
            .then(function(ip) {
                app.info(`getWifiIP() response = ${ip}`);
                if(container) container.innerText = `Connected as ${ip}`;
            })
            .catch(function(reason) {
                app.error(reason);
                if(container) container.innerText = "Not connected";
            });
    },

    getConnectedSSID: function() {
        app.trace();
        return WifiWizard2.getConnectedSSID()
            .then(function(ssid) {
                // app.info(`connected to "${ssid}"`);
                app.currentSSID = ssid;
                return ssid;
            })
            .catch(function(reason) { 
                app.error(reason);
            });
    },
    /**
     * request a scan and return a promise
     * throw errors if issue
     */
    scan: function() {
        app.trace();
        app.log("Scanning...");
        app.startLoader('Searching');
        return WifiWizard2.scan()
            .then(function(data) {
                // app.log("JSON: " + JSON.stringify(data));
                if (data.length === 0) throw "Empty Results";
                app.log("Found: " + data.length);
                app.accessPoints = data;
                // console.log(JSON.stringify(data));
                app.stopLoader();
            })
            .catch(function(reason){ 
                // error
                throw "Error getting list: " + reason;
            })
    },
    log: function(text) {
        const container = document.getElementById("debug");
        const output = container.querySelector("#output");
        const last_entry = container.querySelector("summary .last-entry");

        if (typeof container === "undefined"  || typeof output === "undefined") return;
        var isAtBottom = output.scrollTop >= output.scrollHeight-output.clientHeight;
        app.log_history = app.log_history.slice(-Math.abs(app.max_history));
        app.log_history.push(text);
        output.innerHTML = app.log_history.join("<br>");
        // shift up if alredy at bottom
        if(isAtBottom) {
            output.scrollTop = output.scrollHeight;
        }
        // put the last line on the dropdown handle
        var tmp = document.createElement("div");
        tmp.innerHTML = app.log_history.slice(-1).join("");
        if(last_entry) last_entry.innerText = tmp.innerText;
    },
    trace: function(depth) {
        if(typeof depth === "undefined") depth = 1;
        try{
            var lines = new Error().stack.match(/at (.*?) /g).map(line => line.match(/at .*\.(.*?) /)[1]).slice(depth).reverse();
            if (lines.length > 0) {
                app.log("<em>"+lines.join("->") + "()</em>");
            }
        } catch (error) {
            app.info("ERROR: unable to print trace: " + error.message);
        }
    },
    error: function(text) {
        app.trace();
        app.log("<mark>ERROR: " + text + "</mark>");
    },
    info: function(text) {
        app.log("<strong>INFO: " + text + "</strong>");
    },
    startLoader: function(action) {
        app.updateLoader(action||'Loading');
    },
    stopLoader: function() {
        this.updateLoader('');
    },
    updateLoader: function(text){
        const loader = document.getElementById("loader");
        if(loader) loader.innerHTML = text;
    },
    showReload: function() {
        app.stopLoader();
        var button = document.querySelector(".reload-button");
        if(button) button.classList.remove("d-none");
    },
    hideReload: function() {
        var button = document.querySelector(".reload-button");
        if(button) button.classList.add("d-none");
    },
    reload: function() {
        app.log("Reload requested");
        app.getWifiScanResults();
    },
    connect: function(event) {
        var ssid = event.detail.replace("#",""),
        bindAll = true,
        password = prompt(`Password for ${ssid}?`, "ba6a3afea8"),
        algorithm = 'WPA',
        isHiddenSSID = false;

        app.log("Connection requested: " + ssid);
        
        WifiWizard2.connect(ssid, bindAll, password, algorithm, isHiddenSSID)
            .then(function(){
                app.info(`Connected succesfully to ${ssid}`);
                app.getConnectedSSID();
                app.showWifiNetworks();
            })
            .catch(function(reason){
                app.error(reason);
            })
    }
};

app.initialize();


// Display alert if js error encountered
window.onerror = function(msg, source, lineno, colno, error) {
    app.stopLoader();

    if (msg.toLowerCase().indexOf("script error") > -1) {
        app.error("Script Error: See Browser Console for Detail");
    } else {
        var maskedSource = source;
        var messages = [
            "JS Error",
            '-------------',
            "Message: " + msg,
            "Line: " + lineno,
            "Column: " + colno,
            '-------------'
        ];
        if (Object.keys(error).length > 0) {
            messages.push("Error: " + JSON.stringify(error));
        }
        app.error(messages.join("<br>"));
    }
    return true; // true == prevents the firing of the default event handler.
}
var getClosest = function (elem, selector) {
    for ( ; elem && elem !== document; elem = elem.parentNode ) {
        if ( elem.matches( selector ) ) return elem;
    }
    return null;
};
