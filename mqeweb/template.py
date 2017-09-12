from collections import OrderedDict
import datetime

from flask import session, get_flashed_messages, Markup

from mqe import util
from mqe import tpcreator
from mqe import serialize
from mqe import c
from mqe import mqeconfig

from mqeweb import auth
from mqeweb import webconfig
from mqeweb import webutil
from mqeweb import users
from mqeweb import valdisplay


PROFILE_PAGES = [
    'dashboard',
    'reports',
    'settings',
]

RANGE_VISUALIZATION_OPTIONS = OrderedDict([
    ('ChartRangeDrawer.line', 'graph - line'),
    ('ChartRangeDrawer.spline', 'graph - spline'),
    ('ChartRangeDrawer.area', 'graph - area'),
    ('ChartRangeDrawer.areaspline', 'graph - area spline'),
    ('ChartRangeDrawer.areastacked', 'graph - area stacked'),
    ('TextTableDrawer', 'text table'),
])

SINGLE_VISUALIZATION_OPTIONS = OrderedDict([
    ('ChartSingleDrawer.bar', 'graph - bar'),
    ('ChartSingleDrawer.column', 'graph - column'),
    ('TextSingleDrawer', 'text'),
    #('pie', 'pie'),
])


def get_messagebox_message_list():
    msgs = session.get('messagebox_message_list', [])
    if msgs:
        session['messagebox_message_list'] = []
    return msgs

def user_timezone_offset_in_hours():
    try:
        return webutil.timezone_offset_in_hours(webutil.user_timezone())
    except:
        return 0


def api_key():
    return users.select_api_key(auth.logged_owner_id()) or ''

def to_displayable_html_safe(*args, **kwargs):
    return Markup(valdisplay.to_displayable_html(*args, **kwargs))

GLOBALS = dict(
    PROFILE_PAGES=PROFILE_PAGES,
    RANGE_VISUALIZATION_OPTIONS=RANGE_VISUALIZATION_OPTIONS,
    SINGLE_VISUALIZATION_OPTIONS=SINGLE_VISUALIZATION_OPTIONS,
    get_messagebox_message_list=get_messagebox_message_list,
    user_timezone_offset_in_hours=user_timezone_offset_in_hours,
    auth=auth,
    get_flashed_messages=get_flashed_messages,
    current_timestamp_millis=util.current_timestamp_millis,
    api_key=api_key,
    tpcreator_prefixes=tpcreator.suggested_tpcreator_prefixes,
    webconfig=webconfig,
    datetime_to_timestamp=util.datetime_to_timestamp,
    format_datetime=webutil.format_datetime,
    format_date=webutil.format_date,
    to_displayable_html=to_displayable_html_safe,
    is_value_formatted=valdisplay.is_value_formatted,
    style_for_series=valdisplay.style_for_series,
)


@c.app.template_filter('todata')
def todata(s):
    if s is None:
        return ''
    if isinstance(s, basestring):
        return s
    return serialize.mjson(s)


@c.app.template_filter('timeago')
def timeago(dat):
    if dat is None:
        return 19, '?'
    ts = (datetime.datetime.utcnow() - dat).total_seconds()
    if ts < 0:
        ts = 0
    text = webutil.timetext(ts)
    if ts < 60:
        num = 0
    elif ts < 120:
        num = 1
    elif ts < 300:
        num = 2
    elif ts < 1200:
        num = 3
    elif ts < 3600:
        num = 4
    elif ts < 3*3600:
        num = 5
    elif ts < 12*3600:
        num = 6
    elif ts < 24*3600:
        num = 7
    else:
        days = ts // 86400
        days = min(19, days)
        num = 7 + days
    return num, text


