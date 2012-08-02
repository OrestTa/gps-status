/*
 * Copyright/Copyleft (C) 2012 Orest Tarasiuk <orest.tarasiuk@tum.de>
 *
 * This file is part of Gnome Shell Extension GPS Indicator (GSEGI).
 *
 * GSEGI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * GSEGI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GSEGI.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;
const MyDir = Me.dir.get_child("./").get_path();

const SETTING_ICON = "icon";
const SETTING_SATSHOW = "satshow";
const SETTING_HDOPSHOW = "hdopshow";
const SETTING_GDOPSHOW = "gdopshow";

const SETTING_ENABLE = "enable";
const SETTING_DISABLE = "disable";
const SETTING_SATTEXT = "sattext";
const SETTING_HDOPTEXT = "hdoptext";
const SETTING_GDOPTEXT = "gdoptext";
const SETTING_REFINTRVL = "refinterval";

let settings;
let indicator;
let event=null;
let event2=null;
let newLabel=" ";
let success, pid;
let satshow, hdopshow, gdopshow, sattext, hdoptext, gdoptext, refinterval;

function gps_indicator() {
    this._init.apply(this, arguments);
}

gps_indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _settings_connexion: function() {
        settings.connect("changed::" + SETTING_ICON,
            Lang.bind(this, this._reinit_icon));
        settings.connect("changed::" + SETTING_SATSHOW,
            Lang.bind(this, this._reinit_show));
        settings.connect("changed::" + SETTING_HDOPSHOW,
            Lang.bind(this, this._reinit_show));
        settings.connect("changed::" + SETTING_GDOPSHOW,
            Lang.bind(this, this._reinit_show));

        settings.connect("changed::" + SETTING_ENABLE,
            Lang.bind(this, this._reinit_commands));
        settings.connect("changed::" + SETTING_DISABLE,
            Lang.bind(this, this._reinit_commands));
        settings.connect("changed::" + SETTING_SATTEXT,
            Lang.bind(this, this._reinit_text));
        settings.connect("changed::" + SETTING_HDOPTEXT,
            Lang.bind(this, this._reinit_text));
        settings.connect("changed::" + SETTING_GDOPTEXT,
            Lang.bind(this, this._reinit_text));
        settings.connect("changed::" + SETTING_REFINTRVL,
            Lang.bind(this, this._reinit_refinterval));
    },

    _reinit_icon: function() {
        //global.log("GPS Icon Extension: _reinit_icon called");
        let icon_setting = settings.get_boolean(SETTING_ICON);
        if (icon_setting) {
            //global.log("GPS Icon Extension: Creating icon");
            indicator._create_icon();
            //global.log("GPS Icon Extension: Inserting icon");
            Main.panel._rightBox.insert_child_at_index(indicator._button, 0);
        }
        if (!icon_setting) {
            //global.log("GPS Icon Extension: Removing icon");
            Main.panel._rightBox.remove_child(indicator._button);
            indicator._button.destroy();
        }
    },

    _reinit_show: function() {
        //global.log("GPS Icon Extension: _reinit_show called");
        this._refresh_panel();
    },

    _reinit_commands: function(){
    //global.log("GPS Icon Extension: _reinit_commands called");
    },

    _reinit_text: function(){
        //global.log("GPS Icon Extension: _reinit_text called");
        this._refresh_panel();
    },

    _reinit_refinterval: function(){
        //global.log("GPS Icon Extension: _reinit_refinterval called");
        Mainloop.source_remove(event);
        refinterval = settings.get_string(SETTING_REFINTRVL);
        event = GLib.timeout_add_seconds(0, refinterval, Lang.bind(this, function () {
            this._refresh_gps();
            return true;
        }));
    },

    _init: function(){
        PanelMenu.SystemStatusButton.prototype._init.call(this, "gps");

        this.statusLabel = new St.Label({
            text: "GPS Init",
            style_class: "gps-label"
        });
        // destroy all previously created children, and add our statusLabel
        this.actor.get_children().forEach(function(c) {
            c.destroy()
        });
        this.actor.add_actor(this.statusLabel);
        //Main.panel._centerBox.add(this.actor, { y_fill: true });

        this._fill_menu();
        this._refresh_panel();

        //update every N seconds
        event = GLib.timeout_add_seconds(0, refinterval, Lang.bind(this, function () {
            this._refresh_gps();
            return true;
        }));
    },

    _refresh_panel: function() {
        //global.log("GPS Icon Extension: _refresh_panel called");

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
        this._myMenu = new PopupMenu.PopupMenuItem(_("Refresh now"));
        this.menu.addMenuItem(this._myMenu);
        this._myMenu.connect("activate", Lang.bind(this, this._refresh_gps));

        this._myMenu = new PopupMenu.PopupMenuItem(_("Enable GPS"));
        this.menu.addMenuItem(this._myMenu);
        this._myMenu.connect("activate", Lang.bind(this, this._enable_gps));

        this._myMenu = new PopupMenu.PopupMenuItem(_("Disable GPS"));
        this.menu.addMenuItem(this._myMenu);
        this._myMenu.connect("activate", Lang.bind(this, this._disable_gps));

        this._myMenuStatus = new PopupMenu.PopupMenuItem(_("No GPS data"));
        this.menu.addMenuItem(this._myMenuStatus);
        this._myMenuStatus.connect("activate", Lang.bind(this, this._refresh_gps));
    },

    _update_menu: function() {
        //global.log("GPS Icon Extension: " + this.menu.box.get_children());
        this._myMenuStatus = new PopupMenu.PopupMenuItem(_(newLabel));
        if (this.menu.box.get_children().length > 2){
            this.menu.box.get_children()[3].destroy();
        }
        this.menu.addMenuItem(this._myMenuStatus);
        this._myMenuStatus.connect("activate", Lang.bind(this, this._refresh_gps));
    },

    _create_icon: function(){
        //TODO: Implement some nice icon for GPS quality
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
            this._update_menu();
            this._refresh_gps();
            this._update_menu();
            return false;
        }));
    },

    _refresh_gps: function() {
        //global.log("GPS Icon Extension: Refreshing GPS");

        if (GLib.spawn_command_line_sync("pgrep gpsd")[1] == ""){
            //global.log("GPS Icon Extension: GPSd not running");
            newLabel = "GPS off";
            this.statusLabel.set_text(newLabel);
        }
        else {
            if (newLabel == "GPS off"){
                newLabel = "Waiting for data";
                this.statusLabel.set_text(newLabel);
            }
            if (GLib.spawn_command_line_sync("pgrep gpsd_p_client")[1] == ""){
                //global.log("GPS Icon Extension: GPSd client not running");
                //let pclient = GLib.spawn_command_line_sync(
                //    MyDir + "/gpsd_p_client.py");
                let pclient_command = MyDir + "/gpsd_p_client.py";

                [success, pid] = GLib.spawn_async(
                    null,
                    [pclient_command],
                    null,
                    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                    null
                    );
                if (success && pid !== 0)
                {
                    // Wait for answer
                    //global.log("created process, pid=" + pid);
                    GLib.child_watch_add( GLib.PRIORITY_DEFAULT, pid, function(pid,status) {
                        GLib.spawn_close_pid(pid);
                        //global.log("process completed, status=" + status);
                        let pclient = GLib.file_get_contents("/tmp/python_gpsd_tmp_file");
                        if (pclient[0]){
                            //global.log("GPS Icon Extension: pclient " + pclient[1]);
                            let gpsdata = String(pclient[1]).split(" ");
                            let satNo = -2;
                            if (gpsdata.length >= 0) {
                                satNo = gpsdata[0];
                            }
                            let hdop = -2.0
                            if (gpsdata.length > 0) {
                                hdop = gpsdata[1];
                            }
                            let gdop = -2.0
                            if (gpsdata.length > 1) {
                                gdop = gpsdata[2];
                            }

                            newLabel = "";
                            if (satshow) {
                                if (satNo > -1 && !isNaN(parseInt(satNo))){
                                    newLabel = newLabel + sattext + satNo + " ";
                                }
                                else {
                                    newLabel = newLabel + sattext + "? ";
                                }
                            }
                            if (hdopshow) {
                                if (hdop > -1.0 && !isNaN(parseFloat(hdop))){
                                    newLabel = newLabel + hdoptext +
                                    parseFloat(hdop).toFixed(1) + " ";
                                }
                                else {
                                    newLabel = newLabel + hdoptext + "? ";
                                }
                            }
                            if (gdopshow) {
                                if (gdop > -1.0 && !isNaN(parseFloat(gdop))){
                                    newLabel = newLabel + gdoptext +
                                    parseFloat(gdop).toFixed(1);
                                }
                                else {
                                    newLabel = newLabel + gdoptext + "? ";
                                }
                            }
                            if (newLabel == "" ||
                                newLabel.indexOf("undefined") > -1){
                                newLabel = "No GPS data";
                            }
                            indicator.statusLabel.set_text(newLabel);
                            indicator._update_menu();
                        }
                    });
                }
                else
                {
                    global.log("GPS Icon Extension: failed process creation");
                    newLabel = "No GPS data";
                }
            }
        }
    },

    _enable_gps: function() {
        let enable_setting = settings.get_string(SETTING_ENABLE);
        let enabled = GLib.spawn_command_line_async(enable_setting);
        if (enabled){
            this.statusLabel.set_text("GPS enabled!");
        } else
            this.statusLabel.set_text("Enabling failed! " + enabled);
        newLabel = "No GPS data";
        this._refresh_gps_in(2);
    },

    _disable_gps: function() {
        let disable_setting = settings.get_string(SETTING_DISABLE);
        //global.log("Killing PID: " + pid);
        //global.log(GLib.spawn_command_line_async("kill -9 " + pid));
        let disabled = GLib.spawn_command_line_async(disable_setting);
        if (disabled){
            this.statusLabel.set_text("GPS disabled!");
        } else
            this.statusLabel.set_text("Disabling failed! " + disabled);
        newLabel = "GPS off";
        this._refresh_gps_in(2);
    }
}

function init() {
    global.log("GPS Icon Extension: Initialising");
    settings = Lib.getSettings(Me);
}

function enable() {
    global.log("GPS Icon Extension: Enabling");
    indicator = new gps_indicator();
    Main.panel.addToStatusArea("gps", indicator);
    let icon_setting = settings.get_boolean(SETTING_ICON);
    if (icon_setting) {
        indicator._reinit_icon();
    }
    indicator._settings_connexion();
}

function disable() {
    global.log("GPS Icon Extension: Disabling");
    let icon_setting = settings.get_boolean(SETTING_ICON);
    if (icon_setting) {
        Main.panel._rightBox.remove_child(indicator._button);
    }
    indicator.destroy();
    Mainloop.source_remove(event);
    Mainloop.source_remove(event2);
    indicator = null;
    settings = null;
}