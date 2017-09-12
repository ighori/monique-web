from flask import session

from mqe import dashboards
from mqe import reports

from mqeweb import webutil
from mqeweb.users import User


def login_user(user_id, remember):
    logout_user()

    user_row = User.select(user_id)
    if not user_row:
        return False

    session['owner_id'] = user_id
    session['email'] = user_row['email']
    session['stoken'] = webutil.gen_token()
    session['tz'] = webutil.get_timezone(user_row)
    session['dt_format'] = user_row.user_data.get('dt_format')

    session.permanent = remember

    return True

def logout_user():
    for k in session.keys():
        session.pop(k, None)

def logged_owner_id():
    return session.get('owner_id')

def is_user_logged():
    return logged_owner_id() is not None


### access checking

def access_profile():
    return is_user_logged()

def access_dashboard(dashboard_id):
    if not access_profile():
        return False
    dashboard = dashboards.Dashboard.select(logged_owner_id(), dashboard_id)
    return dashboard and dashboard['owner_id'] == logged_owner_id()

def access_report_instances(report_id):
    if not access_profile():
        return False
    report = reports.Report.select(report_id)
    return report.owner_id == logged_owner_id()

