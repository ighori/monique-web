from flask import Flask

from mqe import c
from mqe import serialize
from mqe import util

from mqeweb import webconfig


def create():
    if webconfig.LOGGING_LEVEL:
        util.setup_logging(webconfig.LOGGING_LEVEL)

    c.app = Flask(import_name=__name__)
    c.app.config.from_object(webconfig.FlaskSettings)

    c.app.json_encoder = serialize.MqeJSONEncoder
    c.app.json_decoder = serialize.MqeJSONDecoder

    from mqeweb import appsetup

    from mqeweb import template
    for name, value in template.GLOBALS.items():
        c.app.jinja_env.globals[name] = value

    from mqeweb import views
    c.app.register_blueprint(views.bp_mqe)

    from mqeweb import valdisplay
    valdisplay.setup_custom_types()

    from mqe.dao.daoregistry import register_dao_modules_from_config
    register_dao_modules_from_config(webconfig)

    return c.app

