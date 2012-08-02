#!/usr/bin/python2
#
############################################################################
#
# Copyright/Copyleft (C) 2012 Orest Tarasiuk <orest.tarasiuk@tum.de>
#
# This file is part of Gnome Shell Extension GPS Indicator (GSEGI).
#
# GSEGI is free software: you can redistribute it and/or modify
# under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# GSEGI is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with GSEGI.  If not, see <http://www.gnu.org/licenses/>.
#
############################################################################

#import signal
import os
from gps import *

#def signal_handler(signal, frame):
#    g.close()
#    sys.exit(0)
#signal.signal(signal.SIGINT, signal_handler)

#g = gps(mode=WATCH_ENABLE)
g = gps(mode=WATCH_NEWSTYLE)

#print "### G PROPERTIES ###"
#for property, value in vars(g).iteritems():
#    print property, ": ", value

f = open('/tmp/python_gpsd_tmp_file', 'w')
#f.write("2 3.5 6.2")
#sys.exit(0)

for report in g:
#    print "### REPORT ###"
#    print report
#    print "### REPORT PROPERTIES ###"
#    for property, value in vars(report).iteritems():
#        print property, ": ", value
#    print "### DATA ###"
    if report.__contains__("satellites"):
        counter = 0
        for sat in report.satellites:
            if (sat.__getitem__("used")):
                counter += 1
        f.write(str(counter) + " ")
        if report.__contains__("hdop"):
            f.write(str(report.__getitem__("hdop")) + " ")
        if report.__contains__("gdop"):
            f.write(str(report.__getitem__("gdop")) + " ")
        break
g.close()
sys.exit(0)
