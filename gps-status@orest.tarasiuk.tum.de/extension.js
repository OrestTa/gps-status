/*
 * Copyright/Copyleft (C) 2012 Orest Tarasiuk <orest.tarasiuk@tum.de>
 *
 * This file is part of Gnome Shell Extension GPS Status (GSEGS).
 *
 * GSEGS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * GSEGS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GSEGS. If not, see <http://www.gnu.org/licenses/>.
 *
 */

const Shell = imports.gi.Shell;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Util = imports.misc.util;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Tweener = imports.ui.tweener;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;

const Name = "gps-status";
const UUID = Name + "@orest.tarasiuk.tum.de";
const _ = imports.gettext.domain(UUID).gettext;

const SETTING_ICON = "icon";
const SETTING_SATSHOW = "satshow";
const SETTING_HDOPSHOW = "hdopshow";
const SETTING_GDOPSHOW = "gdopshow";
const SETTING_COUNTMENUSHOW = "countmenushow";
const SETTING_ENABLE = "enable";
const SETTING_DISABLE = "disable";
const SETTING_SATTEXT = "sattext";
const SETTING_HDOPTEXT = "hdoptext";
const SETTING_GDOPTEXT = "gdoptext";
const SETTING_REFINTRVL = "refinterval";

let settings, indicator;
let event=null;
let event2=null;
let newLabel=" ";
let gpsEnabled;
let connected, sockCl, sockCon, outStr, inStr, dInStr;
let satshow, hdopshow, gdopshow, sattext, hdoptext, gdoptext, refinterval;
let countmenushow = false;
let settingsIdArray = [];

function gps_indicator() {
    this._init.apply(this, arguments);
}

gps_indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _settings_connexion: function() {
        settingsIdArray[0] = settings.connect("changed::" + SETTING_ICON,
            Lang.bind(this, this._reinit_icon));
        settingsIdArray[1] = settings.connect("changed::" + SETTING_SATSHOW,
            Lang.bind(this, this._reinit_show));
        settingsIdArray[2] = settings.connect("changed::" + SETTING_HDOPSHOW,
            Lang.bind(this, this._reinit_show));
        settingsIdArray[3] = settings.connect("changed::" + SETTING_GDOPSHOW,
            Lang.bind(this, this._reinit_show));

        settingsIdArray[4] = settings.connect("changed::" + SETTING_ENABLE,
            Lang.bind(this, this._reinit_commands));
        settingsIdArray[5] = settings.connect("changed::" + SETTING_DISABLE,
            Lang.bind(this, this._reinit_commands));
        settingsIdArray[6] = settings.connect("changed::" + SETTING_SATTEXT,
            Lang.bind(this, this._reinit_text));
        settingsIdArray[7] = settings.connect("changed::" + SETTING_HDOPTEXT,
            Lang.bind(this, this._reinit_text));
        settingsIdArray[8] = settings.connect("changed::" + SETTING_GDOPTEXT,
            Lang.bind(this, this._reinit_text));
        settingsIdArray[9] = settings.connect("changed::" + SETTING_REFINTRVL,
            Lang.bind(this, this._reinit_refinterval));
    },

    _reinit_icon: function() {
        let icon_setting = settings.get_boolean(SETTING_ICON);
        if (icon_setting) {
            indicator._create_icon();
            Main.panel._rightBox.insert_child_at_index(indicator._button, 0);
        }
        if (!icon_setting) {
            Main.panel._rightBox.remove_child(indicator._button);
            indicator._button.destroy();
        }
    },

    _reinit_show: function() {
        this._refresh_panel();
    },

    _reinit_commands: function() {
    },

    _reinit_text: function() {
        this._refresh_panel();
    },

    _reinit_refinterval: function() {
        Mainloop.source_remove(event);
        refinterval = settings.get_string(SETTING_REFINTRVL);
        event = GLib.timeout_add_seconds(0, refinterval, Lang.bind(this, function () {
            this._refresh_gps();
            return true;
        }));
    },

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "gps");

        this.statusLabel = new St.Label({
            text: "GPS Init",
            style_class: "gps-label"
        });
        // destroy all previously created children and add statusLabel
        this.actor.get_children().forEach(function(c) {
            c.destroy()
        });
        this.actor.add_actor(this.statusLabel);
        //Main.panel._centerBox.add(this.actor, { y_fill: true });

        this._fill_menu();
        this._refresh_panel();
        this.actor.connect('button-press-event',
            Lang.bind(this, this._refresh_panel));

        //update every N seconds
        event = GLib.timeout_add_seconds(0, refinterval, Lang.bind(this, function () {
            this._refresh_gps();
            return true;
        }));
    },

    _refresh_panel: function() {
        satshow = settings.get_boolean(SETTING_SATSHOW);
        hdopshow = settings.get_boolean(SETTING_HDOPSHOW);
        gdopshow = settings.get_boolean(SETTING_GDOPSHOW);

        sattext = settings.get_string(SETTING_SATTEXT);
        hdoptext = settings.get_string(SETTING_HDOPTEXT);
        gdoptext = settings.get_string(SETTING_GDOPTEXT);
        refinterval = settings.get_string(SETTING_REFINTRVL);

        this._refresh_gps();
    },

    _fill_menu: function() {
        this.newMenuItem = new PopupMenu.PopupMenuItem(_("Refresh now"));
        this.menu.addMenuItem(this.newMenuItem);
        this.newMenuItem.connect("activate", Lang.bind(this, this._refresh_gps));

        this.newMenuItem = new PopupMenu.PopupMenuItem(_("Enable GPS"));
        this.menu.addMenuItem(this.newMenuItem);
        this.newMenuItem.connect("activate", Lang.bind(this, this._enable_gps));

        this.newMenuItem = new PopupMenu.PopupMenuItem(_("Disable GPS"));
        this.menu.addMenuItem(this.newMenuItem);
        this.newMenuItem.connect("activate", Lang.bind(this, this._disable_gps));

        this.newMenuItem = new PopupMenu.PopupMenuItem(_("Applet Settings"));
        this.menu.addMenuItem(this.newMenuItem);
        this.newMenuItem.connect("activate", Lang.bind(this, this._launchPrefs));

        if (countmenushow) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.newMenuItem = new PopupMenu.PopupMenuItem(_("No GPS data"));
            this.menu.addMenuItem(this.newMenuItem);
            this.newMenuItem.connect("activate", Lang.bind(this, this._refresh_gps));
        }
    },

    _update_menu: function() {
        if (countmenushow) {
            this._myMenuStatus = new PopupMenu.PopupMenuItem(_(newLabel));
            if (this.menu.box.get_children().length > 4) {
                this.menu.box.get_children()[5].destroy();
            }
            this.menu.addMenuItem(this._myMenuStatus);
            this._myMenuStatus.connect("activate", Lang.bind(this, this._refresh_gps));
        }
    },

    _create_icon: function() {
        //TODO: Implement some nice icon(s) as GPS quality indicator
        this._button = new St.Button();
        this._button.set_child(new St.Icon({
            icon_name: "system-run",
            icon_type: St.IconType.SYMBOLIC,
            //icon_size: 17,
            style_class: "system-status-icon"
        }));
    //this._button.connect("clicked", Lang.bind(this, function () {
    //  Util.spawn(["xterm"]);
    //}));
    },

    _refresh_gps_in: function(s) {
        event2 = GLib.timeout_add_seconds(0, s, Lang.bind(this, function () {
            //this._update_menu();
            //this.statusLabel.set_text(newLabel);
            this._refresh_gps();
            this._update_menu();
            this.statusLabel.set_text(newLabel);
            return false;
        }));
    },

    _refresh_gps: function() {
        if (gpsEnabled) {
            //global.log("GPS Icon Extension: Refreshing GPS");
            if (connected && outStr !== null) {
                let written = outStr.write('?POLL;', null);
                if (written > -1) {
                    dInStr.read_line_async(0, null, this._refresh_gps_cb, null);
                }
                else {
                    connected = false;
                    this._connect_gpsd();
                }
            }
            else {
                this._connect_gpsd();
            }
        }
        else {
            newLabel = "GPS off";
            this.statusLabel.set_text(newLabel);
            this._update_menu();
        }
    },

    _disconnect_gpsd: function() {
        connected = false;
        if (dInStr !== null) dInStr.clear_pending();
        if (dInStr !== null) dInStr.close(null);
        if (inStr !== null) inStr.close(null);
        if (outStr !== null) outStr.close(null);
        if (sockCon !== null) sockCon.close(null);
        if (sockCon !== null) sockCon = null;
        sockCl = null;
    },

    _connect_gpsd: function() {
        sockCl = new Gio.SocketClient();
        try {
            sockCon = sockCl.connect_to_host("localhost:2947", 2947, null);
        }
        catch(e) {}
        if (sockCon == null) {
            //global.log("GPS Icon Extension: sockCon is null");
            newLabel = "GPS off";
            gpsEnabled = false;
            this.statusLabel.set_text(newLabel);
            this._update_menu();
        }
        else {
            newLabel = "Connecting";
            this.statusLabel.set_text(newLabel);
            this._update_menu();

            outStr = sockCon.get_output_stream();
            inStr = sockCon.get_input_stream();
            dInStr = Gio.DataInputStream.new(inStr);
            dInStr.read_line_async(0, null, this._refresh_gps_cb_version, indicator);
        }
    },

    _refresh_gps_cb_version: function(object, res, data) {
        dInStr.read_line_finish(res, object); // VERSION
        outStr.write('?WATCH={"enable":true,"json":false};', null);
        dInStr.read_line_async(0, null, indicator._refresh_gps_cb_devices, indicator);
    },

    _refresh_gps_cb_devices: function(object, res, data) {
        dInStr.read_line_finish(res, object); // DEVICES
        dInStr.read_line_async(0, null, indicator._refresh_gps_cb_watch, indicator)
    },

    _refresh_gps_cb_watch: function(object, res, data) {
        dInStr.read_line_finish(res, object); // WATCH
        let written = outStr.write('?POLL;', null);
        if (written > -1) {
            dInStr.read_line_async(0, null, indicator._refresh_gps_cb, written);
            connected = true;
        }
    },

    _refresh_gps_cb: function(object, res, data) {
        let gpsData = dInStr.read_line_finish(res, object).toString();
        let hdop, gdop, satNo;

        let indexSat = gpsData.match(/"used":true/g);
        if (indexSat !== null) {
            satNo = indexSat.length;
        }
        else {
            satNo = 0;
        }

        // "hdop":4.07,"gdop":10.59,"pdop":8.56
        let indexHdop = gpsData.search("hdop");
        if (indexHdop !== -1) {
            hdop = gpsData.slice(indexHdop + 6, indexHdop + 6 + 7)
            hdop = hdop.split(",")[0];
        }

        let indexGdop = gpsData.search("gdop");
        if (indexGdop !== -1) {
            gdop = gpsData.slice(indexGdop + 6, indexGdop + 6 + 7)
            gdop = gdop.split(",")[0];
        }

        newLabel = "";
        if (satshow) {
            if (!isNaN(satNo)) {
                newLabel = newLabel + sattext + satNo + " ";
            }
            else {
                newLabel = newLabel + sattext + "? ";
            }
        }
        if (hdopshow) {
            if (!isNaN(parseFloat(hdop))) {
                newLabel = newLabel + hdoptext +
                parseFloat(hdop).toFixed(1) + " ";
            }
            else {
                newLabel = newLabel + hdoptext + "? ";
            }
        }
        if (gdopshow) {
            if (!isNaN(parseFloat(gdop))) {
                newLabel = newLabel + gdoptext +
                parseFloat(gdop).toFixed(1);
            }
            else {
                newLabel = newLabel + gdoptext + "? ";
            }
        }
        if (newLabel == "" ||
            newLabel.indexOf("undefined") > -1) {
            newLabel = "No GPS data";
        }
        //        this.statusLabel.set_text(newLabel);
        //        this._update_menu();
        indicator.statusLabel.set_text(newLabel);
        indicator._update_menu();
    },

    _enable_gps: function() {
        let enable_setting = settings.get_string(SETTING_ENABLE);
        let enabled = GLib.spawn_command_line_async(enable_setting);
        if (enabled) {
            gpsEnabled = true;
            connected = false;
            this.statusLabel.set_text("GPS enabled!");
            newLabel = "No GPS data";
        } else
            this.statusLabel.set_text("Enabling failed: " + enabled);
        this._refresh_gps_in(2);
    },

    _disable_gps: function() {
        this._disconnect_gpsd();
        let disable_setting = settings.get_string(SETTING_DISABLE);
        let disabled = GLib.spawn_command_line_async(disable_setting);
        if (disabled) {
            gpsEnabled = false;
            this.statusLabel.set_text("GPS disabled!");
            newLabel = "GPS off";
        } else
            this.statusLabel.set_text("Disabling failed: " + disabled);
        this._refresh_gps_in(2);
    },

    _launchPrefs: function() {
        let appSys = Shell.AppSystem.get_default();
        let app = appSys.lookup_app('gnome-shell-extension-prefs.desktop');
        app.launch(global.display.get_current_time_roundtrip(),
            ['extension:///' + UUID], -1, null);
        this.menu.close();
    }
}

function init() {
    //global.log("GPS Icon Extension: Initialising");
    settings = Convenience.getSettings();
}

function enable() {
    connected = false;
    indicator = new gps_indicator();
    Main.panel.addToStatusArea("gps", indicator, 0);
    let icon_setting = settings.get_boolean(SETTING_ICON);
    if (icon_setting) {
        indicator._reinit_icon();
    }
    indicator._settings_connexion();
}

function disable() {
    if (settings.get_boolean(SETTING_ICON)) {
        Main.panel._rightBox.remove_child(indicator._button);
    }
    if (settings !== null && settingsIdArray !== null) {
        for (let i = 0; i < settingsIdArray.length; i++) {
            if (settingsIdArray[i] > -1)
                settings.disconnect(settingsIdArray[i]);
        }
    }
    if (connected) indicator._disconnect_gpsd();
    if (indicator !== null) indicator.destroy();
    Mainloop.source_remove(event);
    Mainloop.source_remove(event2);
    indicator = null;
}
