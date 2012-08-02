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
 * Most of this code was forked from gnome-shell-extensions convenience.js:
 * <http://git.gnome.org/browse/gnome-shell-extensions/tree/lib/convenience.js>
 *
 */

const Gettext = imports.gettext;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;

const Config = imports.misc.config;

/*
   Extension utils
 */

function initTranslations(extension) {
  // FIXME: Add real translations support.
  let domain = 'gnome-shell-gps-indicator';

  // check if this extension was built with "make zip-file", and thus
  // has the locale files in a subfolder
  // otherwise assume that extension has been installed in the
  // same prefix as gnome-shell
  let localeDir = extension.dir.get_child('locale');
  if (localeDir.query_exists(null)) {
    Gettext.bindtextdomain(domain, localeDir.get_path());
  } else {
    Gettext.bindtextdomain(domain, Config.LOCALEDIR);
  }
}

function getSettings(extension) {
  let schema = 'org.gnome.shell.extensions.gps-indicator';

  const GioSSS = Gio.SettingsSchemaSource;

  // check if this extension was built with "make zip-file", and thus
  // has the schema files in a subfolder
  // otherwise assume that extension has been installed in the
  // same prefix as gnome-shell (and therefore schemas are available
  // in the standard folders)
  let schemaDir = extension.dir.get_child('schemas');
  let schemaSource;
  if (schemaDir.query_exists(null)) {
    schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                             GioSSS.get_default(),
                                             false);
  } else {
    schemaSource = GioSSS.get_default();
  }

  let schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj) {
    throw new Error('Schema ' + schema + ' could not be found for extension ' +
                    extension.metadata.uuid + '. Please check your installation.');
  }

  return new Gio.Settings({settings_schema: schemaObj});
}