from __future__ import division

import logging
import uuid
import datetime
import pytz

from werkzeug.wrappers import Response
from flask import request, session, abort

from mqe import serialize


log = logging.getLogger('mqeweb.webutil')


def _ajax_response(is_success, message, result):
    d = {'success': is_success}
    if result:
        d['result'] = result
    if message:
        d['details'] = {
            'message': message
        }
    return serialize.json_dumps(d)

def success(message=None, result=None):
    return Response(_ajax_response(True, message, result), status=200, mimetype='application/json')

def error(message=None, result=None):
    return Response(_ajax_response(False, message, result), status=200, mimetype='application/json')

def stoken_prepare():
    if 'stoken' not in session:
        session['stoken'] = gen_token()

def stoken_check():
    if 'stoken' not in request.form:
        abort(400)
    if request.form['stoken'] != session.get('stoken'):
        abort(403)

def is_email_valid(email):
    if not email:
        return False
    if '@' not in email:
        return False
    return True

def get_timezone(user_row):
    return user_row.user_data.get('chosen_timezone') \
        or user_row.user_data.get('determined_timezone') \
        or 'UTC'

def timezone_offset_in_hours(tz, dt=None):
    if dt is None:
        dt = datetime.datetime.utcnow()
    td = tz.utcoffset(dt)
    return td.total_seconds() / 3600.0

def gen_token():
    return uuid.uuid4().hex

def check_access(f):
    try:
        check_res = f()
        if not check_res:
            abort(403)
    except:
        log.exception('In access checking')
        abort(403)

def autoroute(bp, prefix, *args, **kwargs):
    def decorator(v):
        return bp.route(prefix + v.__name__, *args, **kwargs)(v)
    return decorator

def user_timezone():
    try:
        return pytz.timezone(session['tz'])
    except:
        return pytz.utc

def format_datetime(dt):
    if dt is None:
        return '?'

    try:
        dt = pytz.utc.localize(dt).astimezone(user_timezone())
    except:
        log.exception('In format_datetime, ignoring')

    #return dt.strftime('%c')

    if session.get('dt_format') == 'us':
        res = dt.strftime('%-m/%-d/%y %-I:%M:%S %p')
    else:
        res = dt.strftime('%Y-%m-%d %H:%M:%S')

    return res

def format_date(d):
    if d is None:
        return '?'

    if session.get('dt_format') == 'us':
        res = d.strftime('%-m/%-d/%y')
    else:
        res = d.strftime('%Y-%m-%d')

    return res

def timetext(secs):
    if secs < 1:
        return '%d milliseconds' % int(round(secs*1000))
    if secs < 120:
        return '%d second%s' % (int(secs), '' if secs == 1 else 's')
    if secs < 3600:
        mins = secs // 60
        return '%d minute%s' % (mins, '' if mins == 1 else 's')
    if secs < 86400 * 2:
        hours = secs // 3600
        return '%d hour%s' % (hours, '' if hours == 1 else 's')
    if secs < 86400 * 30:
        days = secs // 86400
        return '%d day%s' % (days, '' if days == 1 else 's')
    months = secs // (86400 * 30)
    return '%d month%s' % (months, '' if months == 1 else 's')

