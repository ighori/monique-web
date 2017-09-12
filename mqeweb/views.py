import logging
import uuid

from flask import Blueprint, request, g, session, flash, render_template, redirect, url_for, send_from_directory, get_template_attribute, Markup, abort
import pytz
import copy

from mqe import dashboards
from mqe import reports
from mqe.reports import Report
from mqe import tpcreator
from mqe import tiles
from mqe import dataseries
from mqe import serialize
from mqe import layouts
from mqe.layouts import Layout
from mqe.util import nestedget, datetime_from_uuid1

from mqeweb.webutil import stoken_prepare, stoken_check, is_email_valid, check_access, success, error, autoroute, format_datetime
from mqeweb import auth
from mqeweb import users
from mqeweb.users import User


log = logging.getLogger('mqeweb.views')


AUTOCOMPLETE_REPORT_NAME_LIMIT = 10
TAGS_SAMPLE_LIMIT = 10
AUTOCOMPLETE_TAG_NAME_LIMIT = 10
RECENT_REPORTS_LIMIT = 10
REPORTS_PER_PAGE = 20
ALL_DT_FORMATS = [
    ('prog', '24-hour'),
    ('us', '12-hour'),
]

bp_mqe = Blueprint('bp_mqe', 'mqeweb.views', template_folder='templates')


### Helpers

def aroute(v):
    """A shortcut for registering ajax calls ("/a/" prefix)"""
    return autoroute(bp_mqe, '/a/', methods=['POST'])(v)


### Static files

@bp_mqe.route('/static/<path:filename>')
def static(filename):
    return send_from_directory('static', filename)

@bp_mqe.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'img/favicon.ico')


### Main page redirect

@bp_mqe.route('/')
def main():
    if auth.is_user_logged():
        return redirect(url_for('bp_mqe.profile_dashboard'))
    return redirect(url_for('bp_mqe.login'))


### Login and signup

@bp_mqe.route('/login', methods=['GET', 'POST'])
def login():
    g.top_page = 'login'

    if request.method == 'GET':
        stoken_prepare()
        return render_template('login.html')

    def err():
        flash('Invalid email or password')
        return redirect(url_for('bp_mqe.login'))

    stoken_check()

    if not request.form['email']:
        return err()

    user = User.select_by_email(request.form['email'])
    if not user:
        return err()

    if not users.is_password_valid(user.user_id, request.form['password']):
        return err()

    log.info('User %r logged in', request.form['email'])

    remember = bool(request.form.get('remember'))

    if not auth.login_user(user.user_id, remember):
        log.warn('Failed login for user %r', request.form['email'])
        return err()

    n = request.args.get('next')
    if n == 'dashboard':
        url = '/dashboard'
    elif n == 'reports':
        url = '/reports'
    elif n == 'settings':
        url = '/settings'
    else:
        url = '/dashboard'
    return redirect(url)


def _check_passwords_error():
    err = False
    if request.form['password'] != request.form['confirm_password']:
        flash('Passwords do not match')
        err = True
    #if len(request.form['password']) < 6:
    #    flash('Password is too short (please enter at least 6 characters)')
    #    err = True
    return err

def _save_determined_timezone(user):
    tz = request.form.get('determined_timezone')
    if tz and tz in pytz.common_timezones:
        user.update_user_data({'determined_timezone': tz})

def _save_dt_format(user):
    determined_timezone = user.user_data.get('determined_timezone')
    if determined_timezone:
        if 'America' in determined_timezone or 'US' in determined_timezone:
            user.update_user_data({'dt_format': 'US/Pacific'})

@bp_mqe.route('/logout')
def logout():
    auth.logout_user()
    return redirect('/')

@bp_mqe.route('/register', methods=['GET', 'POST'])
def register():
    g.top_page = 'signup'

    if request.method == 'GET':
        stoken_prepare()
        return render_template('register.html')

    stoken_check()

    err = False

    email = request.form['email'].strip()
    if not is_email_valid(email):
        flash('Invalid EMAIL')
        err = True

    if _check_passwords_error():
        err = True

    if err:
        return redirect(url_for('bp_mqe.register'))

    if auth.is_user_logged():
        auth.logout_user()

    try:
        user = User.insert(email, request.form['password'])
        _save_determined_timezone(user)
        _save_dt_format(user)
        users.assign_new_api_key(user.user_id)

        log.info('Registered new user %r', request.form['email'])
        auth.login_user(user.user_id, remember=False)
    except ValueError:
        log.exception('When registering %r', email)
        flash('Invalid or already existing EMAIL')
        return redirect(url_for('bp_mqe.register'))

    return redirect(url_for('bp_mqe.profile_dashboard'))



### Dashboards

@bp_mqe.route('/dashboard')
@bp_mqe.route('/dashboard/<dashboard_id_str>')
@bp_mqe.route('/dashboard/<dashboard_id_str>/<dashboard_name>')
def profile_dashboard(dashboard_id_str=None, dashboard_name=None):
    if not auth.access_profile():
        return redirect(url_for('bp_mqe.login', next='dashboard'))
    
    g.profile_page = 'dashboard'

    dbs = dashboards.OwnerDashboards(auth.logged_owner_id())
    if dashboard_id_str is None:
        active_db_id = dbs.dashboards[0].dashboard_id
    else:
        try:
            active_db_id = uuid.UUID(dashboard_id_str)
        except ValueError:
            abort(404)
        if active_db_id not in dbs.dashboard_by_id:
            abort(404)

    layout = Layout.select(auth.logged_owner_id(), active_db_id)

    if not reports.owner_has_reports(auth.logged_owner_id()):
        onboarding = True
    else:
        onboarding = False

    return render_template('profile_dashboard.html',
                   onboarding=onboarding,
                   dashboards=dbs,
                   active_db_id=active_db_id,
                   active_db_layout_id=layout.layout_id,
                   active_db_layout_dict=layout.layout_dict)

@aroute
def fetch_tile_data():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    tile = tiles.Tile.select(dashboard_id, tile_id)
    if not tile:
        return error(message='No tile found, please refresh the page', result='NO_TILE_FOUND')

    check_access(lambda: auth.access_report_instances(tile.report_id))

    data = tile.get_tile_data()

    # Postprocess tile data - generate html
    if tile.tile_options['drawer_type'] == 'TextTableDrawer':
        data['drawer_html'] = get_template_attribute('m.html', 'tile_data_as_table')(
            data, data['series_data_as_rows'])
        del data['series_data_as_rows']
    elif tile.tile_options['drawer_type'] == 'TextSingleDrawer':
        all_empty = not any(bool(d['data_points']) for d in data['series_data'])
        data['drawer_html'] = get_template_attribute('m.html', 'tile_data_as_single_text')(data, all_empty)

    return success(result=dict(tile_options=tile.tile_options, data=data))

@aroute
def set_layout():
    dashboard_id = request.get_json()['dashboard_id']
    layout_id = request.get_json()['layout_id']
    data = request.get_json()['data']
    master_tile_id_resized = request.get_json().get('master_tile_id_resized')

    check_access(lambda: auth.access_dashboard(dashboard_id))

    new_layout = Layout(dict(data))
    new_layout_id = new_layout.set(auth.logged_owner_id(), dashboard_id, layout_id)

    reload_required = False
    if new_layout_id and master_tile_id_resized:
        master_tile = tiles.Tile.select(dashboard_id, master_tile_id_resized)
        if master_tile:
            synced_layout_id = tpcreator.synchronize_sizes_of_tpcreated(master_tile, new_layout_id)
            reload_required = bool(synced_layout_id)

    return success(result=dict(new_layout_id=new_layout_id,
                               reload_required=reload_required))

@aroute
def change_dashboard_ordering():
    dashboard_id_list = request.get_json()['dashboard_id_list']

    check_access(lambda: auth.access_profile())

    dashboards.change_dashboards_ordering(auth.logged_owner_id(), dashboard_id_list)
    return success()

@aroute
def add_dashboard():
    name = request.get_json()['name'].strip()

    check_access(lambda: auth.access_profile())
    
    if not name:
        return error('Empty name')
    for invalid_char in ('/', '\\'):
        if invalid_char in name:
            return error('Invalid character "%s"' % invalid_char)

    dbs = dashboards.OwnerDashboards(auth.logged_owner_id())
    if name in {db.dashboard_name for db in dbs.dashboards}:
        return error('A dashboard with this name is already created')
    new_db = dbs.insert_dashboard(name, {})
    html = get_template_attribute('m.html', 'db_tab')(new_db, False, True)
    return success(result=dict(html=html))

@aroute
def render_dashboard():
    dashboard_id = request.get_json()['dashboard_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    db = dashboards.Dashboard.select(auth.logged_owner_id(), dashboard_id)
    if not db:
        return error('Invalid dashboard')
    layout = Layout.select(auth.logged_owner_id(), dashboard_id)
    html = get_template_attribute('m.html', 'dashboard')(db,
             layout.layout_id if layout else None,
             layout.layout_dict if layout else None)
    return success(result=dict(html=html))

@aroute
def render_empty_series_spec():
    report_id = request.get_json()['report_id']
    report_instance_id = request.get_json()['report_instance_id']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    
    report_instance = report.fetch_single_instance(report_instance_id)
    if report_instance.table.num_columns > 1:
        series_spec = dataseries.SeriesSpec(0, 0, {'op': 'eq', 'args': []})
    else:
        series_spec = dataseries.SeriesSpec(0, -1, {'op': 'eq', 'args': ['0']})
    series_spec.set_name('')
    series_spec_html = get_template_attribute('m.html', 'series_spec')(series_spec, report_instance)
    return success(result=dict(series_spec_html=series_spec_html))

@aroute
def render_series_spec_creator_spec():
    report_id = request.get_json()['report_id']
    report_instance_id = request.get_json()['report_instance_id']
    template_ss = request.get_json()['template_ss']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    report_instance = report.fetch_single_instance(report_instance_id)
    html = get_template_attribute('m.html', 'series_spec_creator_spec')(template_ss,
                                                                        report_instance)
    return success(result=dict(html=html))

@aroute
def matching_cell_for_series_spec():
    report_id = request.get_json()['report_id']
    report_instance_id = request.get_json()['report_instance_id']
    series_spec = request.get_json()['series_spec']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    report_instance = report.fetch_single_instance(report_instance_id)
    if not report_instance:
        return error('No report instance')

    cell = series_spec.get_cell(report_instance)
    if not cell:
        return success()
    return success(result=dict(rowno=cell.rowno,
                               colno=cell.colno))

@aroute
def autocomplete_report_name():
    term = request.get_json()['term']

    check_access(lambda: auth.access_profile())

    report_list = reports.fetch_reports_by_name(auth.logged_owner_id(), term, None,
                                                AUTOCOMPLETE_REPORT_NAME_LIMIT)
    report_names = [report.report_name for report in report_list]

    return success(result=dict(data=report_names))

@aroute
def add_report_name_entered():
    report_name = request.get_json()['report_name']

    check_access(lambda: auth.access_profile())

    report = Report.select_by_name(auth.logged_owner_id(), report_name)
    if not report:
        return error(message='Incomplete report name')
    latest_instance_id = report.fetch_latest_instance_id()
    if not latest_instance_id:
        return error()
    ri = report.fetch_single_instance(latest_instance_id)
    tags = report.fetch_tags_sample('', TAGS_SAMPLE_LIMIT)

    res = {}
    res['has_tags'] = bool(tags)
    res['tag_sample'] = get_template_attribute('m.html', 'tag_sample')(tags)
    res['html_newest_table'] = get_template_attribute('m.html', 'table_as_html_table')(ri.table)
    res['report_id'] = report.report_id
    res['latest_instance_id'] = latest_instance_id
    res['latest_instance_tags'] = ri.all_tags
    return success(result=res)

@aroute
def selected_tags_change():
    report_id = request.get_json()['report_id']
    tags = request.get_json()['tags']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    latest_instance_id = report.fetch_latest_instance_id(tags)
    if not latest_instance_id:
        return error()
    ri = report.fetch_single_instance(latest_instance_id, tags)
    if not ri:
        return error('No report instance %s' % latest_instance_id)

    res = {}
    res['html_newest_table'] = get_template_attribute('m.html', 'table_as_html_table')(ri.table)
    res['latest_instance_id'] = latest_instance_id
    return success(result=res)

@aroute
def autocomplete_tag_name():
    report_id = request.get_json()['report_id']
    term = request.get_json()['term']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    tags = report.fetch_tags_sample(term, AUTOCOMPLETE_TAG_NAME_LIMIT)

    return success(result=dict(data=tags))

@aroute
def compute_series_spec():
    report_id = request.get_json()['report_id']
    report_instance_id = request.get_json()['report_instance_id']
    sample = request.get_json()['sample']

    check_access(lambda: auth.access_report_instances(report_id))

    report = Report.select(report_id)
    report_instance = report.fetch_single_instance(report_instance_id)
    series_spec = dataseries.guess_series_spec(report, report_instance, sample['rowno'],
                                               sample['colno'])
    if series_spec is None:
        return error()
    series_spec_html = get_template_attribute('m.html', 'series_spec')(series_spec, report_instance)
    return success(result=dict(series_spec=series_spec, series_spec_html=series_spec_html))

@aroute
def create_tile():
    dashboard_id = request.get_json()['dashboard_id']
    report_id = request.get_json().get('report_id')
    report_instance_id = request.get_json().get('report_instance_id')
    tile_config = request.get_json()['tile_config']
    moveresize = request.get_json()['moveresize']
    for_layout_id = request.get_json()['for_layout_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))
    check_access(lambda: auth.access_report_instances(report_id))

    if tile_config['tags']:
        tile_config['tile_options']['tpcreator_uispec'] = tpcreator.suggested_tpcreator_uispec(
            tile_config['tags'])

    tile = tiles.Tile.insert(auth.logged_owner_id(), report_id, dashboard_id, tile_config)
    mres = layouts.place_tile(tile, for_layout_id=for_layout_id)
    if not mres:
        return error(message='Could not place the new tile on the dashboard, a page refresh is needed')

    dataseries.update_default_options(tile)

    log.info('Created new tile report_id=%s dashboard_id=%s tile_id=%s', report_id, dashboard_id,
             tile.tile_id)

    tile_html = get_template_attribute('m.html', 'dashboard_tile')\
        (tile.tile_id, mres.new_tiles[tile], moveresize)
    return success(result=dict(
        tile_html=tile_html,
        new_layout_id=mres.new_layout.layout_id,
    ))


@aroute
def render_recent_reports():
    check_access(lambda: auth.access_profile())

    report_list = reports.fetch_reports_by_name(auth.logged_owner_id(), limit=RECENT_REPORTS_LIMIT)
    report_names = [report.report_name for report in report_list]

    html = get_template_attribute('m.html', 'recent_reports')(report_names)

    return success(result=dict(html=html))

@aroute
def fetch_tile_settings():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    tile = tiles.Tile.select(dashboard_id, tile_id)
    if not tile:
        return error(message='No tile found, please refresh the page')

    check_access(lambda: auth.access_report_instances(tile.report_id))

    res = {}

    res['report_id'] = tile.report_id
    latest_instance_id = tile.report.fetch_latest_instance_id(tile.tile_options['tags'])
    if not latest_instance_id:
        return error(message='No report instances for report %s - at least one report instance is needed to display tile settings.' % tile.report.report_name)
    ri = tile.report.fetch_single_instance(latest_instance_id, tile.tile_options['tags'])
    res['latest_instance_id'] = latest_instance_id

    res['html_newest_table'] = get_template_attribute('m.html', 'table_as_html_table')(ri.table)

    if tile.tile_options['tags']:
        res['html_selected_tags'] = get_template_attribute('m.html', 'selected_tags')(tile.tile_options['tags'])
        tpcreator_uispec = tile.tile_options.get('tpcreator_uispec')
        if not tpcreator_uispec:
            tpcreator_uispec = tpcreator.suggested_tpcreator_uispec(tile.tile_options['tags'])
        res['html_tpcreator_content'] = get_template_attribute('m.html', 'tpcreator_content')(tpcreator_uispec)

    else:
        res['html_selected_tags'] = None
        res['html_tpcreator_content'] = None

    res['tile_options'] = tile.tile_options
    res['report_name'] = tile.report.report_name


    html_series_specs = []
    for series_spec in tile.series_specs():
        data_d = {}
        cell = series_spec.get_cell(ri)
        if cell:
            data_d['sampled-from'] = {'rowno': cell.rowno, 'colno': cell.colno}
        html_series_specs.append(get_template_attribute('m.html', 'series_spec')(series_spec, ri, data_d))
    res['html_all_series_specs'] = '\n'.join(html_series_specs)

    if tile.tile_options.get('sscs'):
        res['html_sscs'] = get_template_attribute('m.html', 'series_spec_creator_spec')(tile.tile_options['sscs'], ri)
    else:
        res['html_sscs'] = None

    return success(result=res)


@aroute
def replace_tile():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']
    report_id = request.get_json()['report_id']
    tile_config = request.get_json()['tile_config']
    for_layout_id = request.get_json()['for_layout_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))
    check_access(lambda: auth.access_report_instances(report_id))

    tile = tiles.Tile.select(dashboard_id, tile_id)
    if not tile:
        return error(message='No tile found, please refresh the page')
    new_tile = tile.insert_similar(tile_config)

    repl_res = layouts.replace_tiles({tile: new_tile}, for_layout_id)
    if not repl_res:
        return error('A newer version of the dashboard is available, please refresh the page')
    log.info('Replaced tile %s with tile %s', tile_id, new_tile.tile_id)

    dataseries.update_default_options(new_tile)

    tpcreated_replacement = [[t1.tile_id, t2.tile_id]
                             for (t1, t2) in repl_res.tile_replacement.items()
                             if t2 != new_tile]

    return success(result=dict(new_tile=new_tile,
                               new_layout_id=repl_res.new_layout.layout_id,
                               tpcreated_replacement=tpcreated_replacement))


@aroute
def delete_tile():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']
    for_layout_id = request.get_json()['for_layout_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    tile = tiles.Tile.select(dashboard_id, tile_id)
    if not tile:
        return error('Invalid tile')

    mres = layouts.detach_tile(tile, for_layout_id=for_layout_id)
    if not mres:
        return error(message='Could not delete the tile, a page refresh is needed')
    log.info('Deleted tile dashboard_id=%s tile_id=%s', dashboard_id, tile_id)

    return success(result=dict(new_layout_id=mres.new_layout.layout_id))


@aroute
def fetch_move_tile_data():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    dbs = dashboards.OwnerDashboards(auth.logged_owner_id())
    options = [(serialize.mjson(db.dashboard_id), db.dashboard_name)
               for db in dbs.dashboards
               if db.dashboard_id != dashboard_id]
    tile = tiles.Tile.select(dashboard_id, tile_id)
    if not tile:
        return error('Invalid tile')
    result = dict(
        report_name=tile.report.report_name,
        has_options=bool(options),
        html_dashboard_select=get_template_attribute('m.html', 'select')('move-to-dashboard-select', options),
    )
    return success(result=result)

@aroute
def move_tile():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id = request.get_json()['tile_id']
    target_dashboard_id = request.get_json()['target_dashboard_id']
    for_layout_id = request.get_json()['for_layout_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))
    check_access(lambda: auth.access_dashboard(target_dashboard_id))

    old_tile = tiles.Tile.select(dashboard_id, tile_id)
    if not old_tile:
        return error('Invalid source tile in move_tile %s %s' % (dashboard_id, tile_id))

    new_tile = old_tile.copy(target_dashboard_id)
    if not layouts.place_tile(new_tile):
        return error('Cannot copy the source file')

    mres = layouts.detach_tile(old_tile, for_layout_id=for_layout_id)
    if not mres:
        return error(message='Deletion of the source tile unsuccessful due to old page data')

    log.info('Moved tile tile_id=%s dashboard_id=%s to tile tile_id=%s dashboard_id=%s',
             tile_id, dashboard_id, new_tile.tile_id, target_dashboard_id)

    return success(result=dict(new_layout_id=mres.new_layout.layout_id))


@aroute
def delete_dashboard():
    dashboard_id = request.get_json()['dashboard_id']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    dashboard = dashboards.Dashboard.select(auth.logged_owner_id(), dashboard_id)
    if not dashboard:
        return error('No such dashboard')
    dashboard.delete()
    return success()


@aroute
def update_dashboard():
    dashboard_id = request.get_json()['dashboard_id']
    new_dashboard_name = request.get_json()['new_dashboard_name'].strip()
    max_without_data = request.get_json().get('max_without_data')
    enable_synchronizing_tpcreated = request.get_json()['enable_synchronizing_tpcreated']
    enable_synchronizing_tpcreated_x_axes = request.get_json()['enable_synchronizing_tpcreated_x_axes']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    dashboard = dashboards.Dashboard.select(auth.logged_owner_id(), dashboard_id)
    if not dashboard:
        return error('Invalid dashboard')

    res = {}
    if dashboard.dashboard_name != new_dashboard_name:
        dashboard.update(dashboard_name=new_dashboard_name)
        res['new_dashboard_name'] = new_dashboard_name

    res['reloading_dashboard_required'] = \
        dashboard.dashboard_options.get('enable_synchronizing_tpcreated', True) != \
        enable_synchronizing_tpcreated or \
        dashboard.dashboard_options.get('enable_synchronizing_tpcreated_x_axes', False) != \
        enable_synchronizing_tpcreated_x_axes

    new_dashboard_options = copy.deepcopy(dashboard.dashboard_options)

    new_dashboard_options['max_without_data'] = max_without_data
    new_dashboard_options['enable_synchronizing_tpcreated'] = enable_synchronizing_tpcreated
    new_dashboard_options['enable_synchronizing_tpcreated_x_axes'] = \
        enable_synchronizing_tpcreated_x_axes

    dashboard.update(dashboard_options=new_dashboard_options)
    res['new_dashboard_options'] = new_dashboard_options

    log.info('Updated dashboard %s with options %s', dashboard_id, new_dashboard_options)

    return success(result=res)


@aroute
def request_expire_tiles_without_data():
    dashboard_id = request.get_json()['dashboard_id']
    tile_id_list = request.get_json()['tile_id_list']

    check_access(lambda: auth.access_dashboard(dashboard_id))

    dashboard = dashboards.Dashboard.select(auth.logged_owner_id(), dashboard_id)
    if not dashboard:
        return error('No dashboard')
    max_seconds_without_data = nestedget(dashboard.dashboard_options,
                                         'max_without_data', 'seconds_back')
    if not max_seconds_without_data:
        log.warn('request_expire_tiles_without_data called with empty max_seconds_without_data')
        return

    tile_list = tiles.Tile.select_multi(dashboard_id, tile_id_list).values()

    new_layout_id = tiles.expire_tiles_without_data(tile_list, max_seconds_without_data, None)

    return success(result=dict(tiles_expired=bool(new_layout_id)))



### /profile/reports


@bp_mqe.route('/reports')
def profile_reports():
    if not auth.access_profile():
        return redirect(url_for('bp_mqe.login', next='dashboard'))

    g.profile_page = 'reports'

    check_access(lambda: auth.access_profile())

    filter_s = request.args.get('filter_s')
    last_report_id = request.args.get('last_report_id')

    if last_report_id:
        last_report_id = uuid.UUID(last_report_id)

    report_list = _report_list(filter_s, last_report_id)

    return render_template('profile_reports.html',
                           report_list=report_list,
                           filter_s=None,
                           has_next=len(report_list) == REPORTS_PER_PAGE)

def _report_list(filter_s, last_report_id):
    if not filter_s:
        filter_s = None

    if last_report_id:
        last_report_name = Report.select(last_report_id).report_name
    else:
        last_report_name = None

    report_list = reports.fetch_reports_by_name(auth.logged_owner_id(), filter_s, last_report_name,
                                                REPORTS_PER_PAGE)
    res = [{'report': report} for report in report_list]

    # fill latest_instance_dt
    for report_d in res:
        report_d['latest_instance_dt'] = None
        latest_instance_id = report_d['report'].fetch_latest_instance_id()
        if latest_instance_id:
            latest_ri = report_d['report'].fetch_single_instance(latest_instance_id)
            if latest_ri:
                report_d['latest_instance_dt'] = latest_ri.created

    return res


@aroute
def fetch_report_list():
    filter_s = request.get_json().get('filter_s')
    last_report_id = request.get_json().get('last_report_id')

    check_access(lambda: auth.access_profile())

    report_list = _report_list(filter_s, last_report_id)
    html = get_template_attribute('m.html', 'reports_list_page')(report_list, filter_s, len(report_list) == REPORTS_PER_PAGE)
    return success(result=dict(html=html))



### RIViewer

@aroute
def report_instance_for_viewer():
    report_name = request.get_json()['report_name']
    tags = request.get_json().get('tags')
    curr_report_instance_id = request.get_json()['curr_report_instance_id']
    direction = request.get_json().get('direction')
    search_date = request.get_json().get('search_date')

    check_access(lambda: auth.access_profile())

    report = Report.select_by_name(auth.logged_owner_id(), report_name)

    if not curr_report_instance_id:
        curr_report_instance_id = report.fetch_latest_instance_id(tags)
        if not curr_report_instance_id:
            return error()
    if not direction:
        if search_date is not None:
            ri = report.find_report_instance_by_dt(search_date, tags)
        else:
            ri = report.fetch_single_instance(curr_report_instance_id)
    elif direction == 'next':
        ri = report.fetch_next_instance(curr_report_instance_id, tags)
    elif direction == 'prev':
        ri = report.fetch_prev_instance(curr_report_instance_id, tags)
    else:
        return error('Wrong direction')
    res = {}
    res['report_id'] = report.report_id
    res['report_has_tags'] = report.has_tags()
    if ri:
        res['html_newest_table'] = get_template_attribute('m.html', 'table_as_html_table')(ri.table)
        res['created_raw'] = datetime_from_uuid1(ri.report_instance_id)
        res['created'] = format_datetime(datetime_from_uuid1(ri.report_instance_id))
        res['tags'] = Markup(' '.join('<span class="selected-tag-name clickable">%s</span>' % tag for tag in ri.all_tags))
        res['curr_report_instance_id'] = ri.report_instance_id
        res['has_next'] = report.fetch_next_instance(ri.report_instance_id, tags) is not None
        res['has_prev'] = report.fetch_prev_instance(ri.report_instance_id, tags) is not None
    else:
        res['html_newest_table'] = ''
        res['created_raw'] = ''
        res['created'] = ''
        res['tags'] = ''
        res['curr_report_instance_id'] = None
        res['has_next'] = False
        res['has_prev'] = False

    return success(result=res)


@aroute
def report_instances_days():
    report_name = request.get_json()['report_name']
    tags = request.get_json().get('tags')

    check_access(lambda: auth.access_profile())

    report = Report.select_by_name(auth.logged_owner_id(), report_name)
    days_dts = report.fetch_days(tags)
    days = [dt.strftime('%Y-%m-%d') for dt in days_dts]

    return success(result=dict(days=days))




### Settings


@bp_mqe.route('/settings')
@bp_mqe.route('/settings/<settings_page>', methods=['GET', 'POST'])
def profile_settings(settings_page=None):
    if not auth.access_profile():
        return redirect(url_for('bp_mqe.login', next='settings'))
    g.profile_page = 'settings'

    if not settings_page:
        return redirect(url_for('bp_mqe.profile_settings', settings_page='preferences'))

    g.settings_page = settings_page
    return globals()['profile_settings_%s' % settings_page]()

@bp_mqe.route('/settings/preferences/reissue-api-key', methods=['POST'])
def reissue_api_key():
    check_access(lambda: auth.access_profile())

    stoken_check()

    users.assign_new_api_key(auth.logged_owner_id())
    flash('New API key has been issued')

    return redirect(url_for('bp_mqe.profile_settings', settings_page='preferences'))


def profile_settings_preferences():
    check_access(lambda: auth.access_profile())

    if request.method == 'GET':
        api_key = users.select_api_key(auth.logged_owner_id()) or ''

        used_report_instances = reports.report_instance_count_for_owner(auth.logged_owner_id())
        used_diskspace = reports.report_instance_diskspace_for_owner(auth.logged_owner_id())

        selected_timezone = session['tz']

        selected_dt_format = session.get('dt_format', ALL_DT_FORMATS[0][0])

        user_row = User.select(auth.logged_owner_id())

        return render_template('profile_settings_preferences.html',
                               user_row=user_row,
                               api_key=api_key,
                               used_report_instances=used_report_instances,
                               used_diskspace=used_diskspace,
                               all_timezones=pytz.common_timezones,
                               selected_timezone=selected_timezone,
                               all_dt_formats=ALL_DT_FORMATS,
                               selected_dt_format=selected_dt_format)

    stoken_check()

    user = User.select(auth.logged_owner_id())

    d = {}

    timezone = request.form['timezone']
    if timezone and timezone in pytz.common_timezones:
        d['chosen_timezone'] = timezone
        session['tz'] = timezone

    dt_format = request.form['dt_format']
    if dt_format and dt_format in {x[0] for x in ALL_DT_FORMATS}:
        d['dt_format'] = dt_format
        session['dt_format'] = dt_format

    user.update_user_data(d)
    flash('Preferences updated')

    log.info('Updated user preferences with %s', d)

    return redirect(url_for('bp_mqe.profile_settings', settings_page='preferences'))

