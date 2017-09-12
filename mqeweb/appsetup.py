import logging
import time

from flask import request_started, request_finished, request, abort, session, g
import werkzeug.exceptions

from mqe import c


log = logging.getLogger('mqeweb')


@request_started.connect_via(c.app)
def log_request_start(*args, **kwargs):
    g.request_start_time = time.time()
    log.info('HTTP_START %s %s', request.method, request.url)

@request_finished.connect_via(c.app)
def log_request_end(*args, **kwargs):
    log.info('HTTP_END %s %s %s (%.1f)', request.method, request.url,
             kwargs['response'].status_code, (time.time() - g.request_start_time) * 1000)

@request_started.connect_via(c.app)
def check_stoken(*args, **kwargs):
    if request.is_xhr:
        try:
            req_json = request.get_json()
        except werkzeug.exceptions.BadRequest:
            return
        if isinstance(req_json, dict):
            if 'stoken' not in req_json:
                log.error('No stoken in ajax body')
                abort(403)
            if 'stoken' not in session:
                log.error('No stoken in session')
                abort(403)
            if req_json['stoken'] != session['stoken']:
                log.error('Stoken mismatch between ajax body and session: %r %r',
                          req_json['stoken'], session['stoken'])
                abort(403)

