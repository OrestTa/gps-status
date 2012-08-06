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
 * along with GSEGS.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;
const Gettext = imports.gettext.domain("gps-status");
const _ = Gettext.gettext;

let settings;
let boolSettings;
let stringSettings;

function _createBoolSetting(setting) {
    let hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL
    });

    let settingLabel = new Gtk.Label({
        label: boolSettings[setting].label,
        xalign: 0
    });

    let settingSwitch = new Gtk.Switch({
        active: settings.get_boolean(setting)
    });
    settingSwitch.connect("notify::active", function(button) {
        settings.set_boolean(setting, button.active);
    });

    if (boolSettings[setting].help) {
        settingLabel.set_tooltip_text(boolSettings[setting].help);
        settingSwitch.set_tooltip_text(boolSettings[setting].help);
    }

    hbox.pack_start(settingLabel, true, true, 0);
    hbox.add(settingSwitch);

    return hbox;
}

function createStringSetting(setting) {
    let hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 5
    });

    let setting_label = new Gtk.Label({
        label: stringSettings[setting].label,
        xalign: 0
    });

    let setting_string = new Gtk.Entry({
        text: settings.get_string(setting.replace("_", "-"))
    });
    setting_string.connect("notify::text", function(entry) {
        settings.set_string(setting.replace("_", "-"), entry.text);
    });

    if (stringSettings[setting].mode == "passwd") {
        setting_string.set_visibility(false);
    }

    if (stringSettings[setting].help) {
        setting_label.set_tooltip_text(stringSettings[setting].help)
        setting_string.set_tooltip_text(stringSettings[setting].help)
    }

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_string);

    return hbox;
}

/*
   Shell-extensions handlers
 */

function init() {
    Convenience.initTranslations();
    settings = Convenience.getSettings();

    boolSettings = {
        /*icon: {
            label: _("Show icon"),
            help: _("Show an icon next to the status text")
        },*/
        satshow: {
            label: _("Show satellite number"),
            help: _("Show the number of available satellites")
        },
        hdopshow: {
            label: _("Show HDOP"),
            help: _("Show the horizontal dilution of precision coefficient")
        },
        gdopshow: {
            label: _("Show GDOP"),
            help: _("Show the geometric dilution of precision coefficient")
        }
    };

    stringSettings = {
        enable: {
            label: _("GPS enable command"),
            help: _("The command used to enable your GPS")
        },
        disable: {
            label: _("GPS disable command"),
            help: _("The command used to disable your GPS")
        },
        sattext: {
            label: _("GPS enable command"),
            help: _("The text shown in the panel before the satellite number")
        },
        hdoptext: {
            label: _("HDOP text"),
            help: _("The text shown in the panel before the horizontal dilution of precision coefficient")
        },
        gdoptext: {
            label: _("GDOP text"),
            help: _("The text shown in the panel before the geometric dilution of precision coefficient")
        },
        refinterval: {
            label: _("Refresh interval [s]"),
            help: _("The interval between polls to gpsd")
        }
    };
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        border_width: 10
    });
    let vbox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin: 20,
        margin_top: 10
    });

    // Add all string settings
    for (setting in stringSettings) {
        let hbox = createStringSetting(setting);
        vbox.add(hbox);
    }
    // Add all bool settings
    for (setting in boolSettings) {
        let hbox = _createBoolSetting(setting);
        vbox.add(hbox);
    }

    frame.add(vbox);
    frame.show_all();

    return frame;
}
