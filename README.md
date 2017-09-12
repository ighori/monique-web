# Monique Web

![Monique Web screenshot](http://monique-dashboards.readthedocs.io/en/latest/_images/monique-web-1.png)

Monique Web is a fully featured web application supporting creating custom dashboards, built using [Monique library](https://github.com/monique-dashboards/monique) and taking advantage of the library's features:

* tiles display data from [report instances](http://monique-dashboards.readthedocs.io/en/latest/tutorial.html#basic-concepts), which represent data from multiple sources, like SQL query results, JSON documents, CSV files, single metrics
* the data can be visualized using a chart, a table or textual information
* data series can be [created automatically](http://monique-dashboards.readthedocs.io/en/latest/sscreator.html) (for example, all rows contained in SQL results can be automatically included)
* tiles can be [created automatically](http://monique-dashboards.readthedocs.io/en/latest/tpcreator.html) (for example, a tile could be created for each IP address that sends data)




## Installation

[Monique library](https://github.com/monique-dashboards/monique) must be [installed](http://monique-dashboards.readthedocs.io/en/latest/installation.html) as a prerequisite. Note that the `mqeconifg_override.py` file, created during installation, will need to be placed in the `$PYTHONPATH`.

Monique Web isn't available on PyPI, but can be run from a git clone:

    $ git clone https://github.com/monique-dashboards/monique-web.git

The requirements can be installed using `pip`:

    $ pip install -r monique-web/requirements.txt


#### Executing database migrations

 Monique Web supports both the SQLite3 and the Cassandra database.

 For the SQLite3 database, files having the extension `.sqlite3` must be executed:

     $ cat monique-web/migrations/*.sqlite3 | sqlite3 /var/lib/monique.db

For the Cassandra database, files having the extension `.cql` must be executed:

    $ for file in monique-web/migrations/*.cql; do cqlsh 127.0.0.1 -f "$file"; done

#### Configuring the app

For security reasons the Flask's [SECRET_KEY](http://flask.pocoo.org/docs/0.12/api/#flask.Flask.secret_key) and SALT settings should be changed, to ensure cookies will not be decoded by an attacker. Additionaly, external URLs under which Monique Web and Monique API will be available can be configured. The values should be put into the `webconfig_override.py` file:

    # The base URL under which the web application is available
    BASE_URL_WEB = 'https://example.com:8100'

    # The base URL under which the API application is available
    BASE_URL_API = 'https://example.com:8101'

    class FlaskSettings(object):
        # !!! The values should be changed for openly accessible apps
        SECRET_KEY = '\xf3,\xe2c\xa6q\xba<\xe1\x9b\x05\x88\xf9,\xb5s+\x13\xd1u\xceY\x9d\x08'
        SALT = '\xde\x1c\xcb\x86'




#### Running the WSGI app

The WSGI application (which is also a Flask application) is returned by the function `mqeweb.webapp.create()`.

For example, the following commands run Monique Web using [Gunicorn](http://gunicorn.org/) server:

    $ cd monique-web
    $ ls *_override.py # ensure the config modules are present
    mqeconfig_override.py webconfig_override.py

    $ pip install gunicorn
    $ gunicorn -b 0.0.0.0:8100 'mqeweb.webapp:create()'

The application should be running under URL `http://localhost:8100`. Note that when the application is available through the internet, using HTTPS is strongly recommended.

At this point you will probably want to install [Monique API](https://github.com/monique-dashboards/monique-api), which provides a HTTP REST API for submitting report instances. An alternative is to use the [Monique library's API](http://monique-dashboards.readthedocs.io/en/latest/tutorial.html) directly.

## Used libraries

Besides [Monique](https://github.com/monique-dashboards/monique), which implements the backend, the list of used libraries includes:

* [Flask](http://flask.pocoo.org/) - used as a web framework
* [Gridstack](https://troolee.github.io/gridstack.js/) - used to implement a dashboard grid
* [Chart.js](http://www.chartjs.org/) - used for rendering charts (the library draws inside a Canvas element)

Monique Web uses only libraries with liberal open source licenses, like BSD or MIT.


