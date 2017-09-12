### The configuration of the Monique Web app. The configuration can be
### overriden by putting a subset of config variables in webconfig_override.py file
### (which must be in PYTHONPATH).



# The base URL under which the web application is available
BASE_URL_WEB = 'http://localhost:8100'

# The base URL under which the API application is available
BASE_URL_API = 'http://localhost:8101'


# Flask settings

class FlaskSettings(object):
    # !!! The values should be changed for openly accessible apps
    SECRET_KEY = '\xf3,\xe2c\xa6q\xba<\xe1\x9b\x05\x88\xf9,\xb5s+\x13\xd1u\xceY\x9d\x08'
    SALT = '\xde\x1c\xcb\x86'

    TEMPLATES_AUTO_RELOAD = True


# The logging level of messages outputted to stdout. Setting NONE disables
# configuring the logging.
LOGGING_LEVEL = 'INFO'


DAO_MODULES = [
    ('cassandra', 'mqeweb.dao.cassandradb.cassandradao'),
    ('sqlite3', 'mqeweb.dao.sqlite3db.sqlite3dao'),
]


try:
    import webconfig_override
    reload(webconfig_override)
    from webconfig_override import *
except ImportError:
    pass
