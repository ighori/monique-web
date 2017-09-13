import logging
import datetime
import numbers
import cgi

import markdown

from mqetables import enrichment
from mqe import serialize
from mqe.util import safeget
from mqe import mqeconfig

from mqeweb import webutil


log = logging.getLogger('mqeweb.valdisplay')


HTML_STYLE_TRUE = 'color: #358455;'
HTML_STYLE_FALSE = 'color: #AD2D19;'
MARGIN_PX_FOR_EACH_LEVEL = 20
MAX_DISPLAYABLE_OBJECT_LEVELS = 20


@serialize.json_type('MarkdownContent')
class MarkdownContent(object):
    
    def __init__(self, content):
        self.content = content

    def render(self):
        return markdown.markdown(self.content, output_format='html5', extensions=['markdown.extensions.tables'])

    def for_json(self):
        return {'arg': self.content}

    def for_external_json(self):
        return self.content

    @classmethod
    def from_rawjson(cls, raw):
        return MarkdownContent(raw['arg'])

    def __hash__(self):
        return hash(self.content)

    def __cmp__(self, other):
        if not isinstance(other, MarkdownContent):
            return -1
        return cmp(self.content, other.content)


@serialize.json_type('SC')
class SingleContent(object):
    
    def __init__(self, content):
        self.content = content

    def for_json(self):
        return {'arg': self.content}

    def for_external_json(self):
        return self.content

    @classmethod
    def from_rawjson(cls, raw):
        return SingleContent(raw['arg'])

    def __hash__(self):
        return hash(self.content)

    def __cmp__(self, other):
        if not isinstance(other, SingleContent):
            return -1
        return cmp(self.content, other.content)


def style_for_series(tile_data, series_index):
    color = safeget(tile_data['combined_colors'], series_index)
    if not color:
        return ''
    return 'color: %s;' % color

def is_value_formatted(val):
    return isinstance(val, MarkdownContent)

def _span(style, val):
    return """<span style="%s">%s</span>""" % (style, val)

def to_displayable_html(val, style=None, _level=0):
    style = style or ''
    try:
        if _level > MAX_DISPLAYABLE_OBJECT_LEVELS:
            return ''
        ev = enrichment.EnrichedValue(val)
        if ev.as_bool is not None:
            if ev.as_bool:
                style = HTML_STYLE_TRUE
            else:
                style = HTML_STYLE_FALSE
            return _span(style, str(val))
        if val is None:
            return '&empty;'
        if isinstance(val, datetime.date):
            if not isinstance(val, datetime.datetime):
                val = webutil.format_date(val)
            else:
                val = webutil.format_datetime(val)
            return _span(style, cgi.escape(val, quote=True))
        if isinstance(val, basestring):
            val = cgi.escape(val, quote=True)
            val = val.replace('\n', '<br>')
            return _span(style, val)
        if isinstance(val, numbers.Number):
            return _span(style, str(val))
        if isinstance(val, SingleContent):
            return """<pre style='%s' class=single-content>%s</pre>""" % (style, cgi.escape(val.content, quote=True))
        if isinstance(val, MarkdownContent):
            return _span(style, val.render())

        level_style = """margin-left: %spx;""" % (MARGIN_PX_FOR_EACH_LEVEL * _level)
        if isinstance(val, list):
            lines = []
            lines.append("""<div class=displayable-list style='%s %s'>""" % (style, level_style))
            for x in val:
                below = to_displayable_html(x, style, _level+1)
                if isinstance(x, (list, dict)):
                    lines.append(below)
                else:
                    lines.append('<div>&mdash; %s</div>' % below)
            lines.append('</div>')
            return '\n'.join(lines)
        if isinstance(val, dict):
            lines = []
            lines.append("""<div class=displayable-object style='%s %s'>""" % (style, level_style))
            for k, v in val.iteritems():
                lines.append('<div>&mdash; %s: %s</div>' % (k, to_displayable_html(v, style, _level+1)))
            lines.append('</div>')
            return '\n'.join(lines)
        # Fallback: json serialization
        try:
            return serialize.json_dumps_external(val)
        except:
            try:
                return unicode(val)
            except:
                return repr(val)
    except:
        log.exception('In to_displayable_html, returning safe value')
        return '<em>Invalid value</em>'


def setup_custom_types():
    from mqetables import parseany
    from mqetables import basicparsing
    from mqetables.enrichment import EnrichedTable

    def get_table_from_parsing_result(parsing_result):
        if not parsing_result.table:
            return None
        if parsing_result.input_type == 'single':
            return EnrichedTable.one_cell_table(
                SingleContent(parsing_result.table.rows[0][0].raw))
        if parsing_result.input_type == 'markdown':
            return EnrichedTable.one_cell_table(
                MarkdownContent(parsing_result.table.rows[0][0].raw))
        return parsing_result.table

    mqeconfig.get_table_from_parsing_result = get_table_from_parsing_result

    parseany.register_input_parsers('markdown', basicparsing.OneCellParser)
    mqeconfig.get_table_from_parsing_result = get_table_from_parsing_result
