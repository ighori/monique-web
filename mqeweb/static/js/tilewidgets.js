Mqe.Tw = {};

// PART Chart.js setup


Mqe.Tw.initChartjs = function() {
    Chart.defaults.global['defaultFontColor'] = '#1F5C63';
    Chart.defaults.global['defaultFontFamily'] = "'Lato', 'Arial', 'sans-serif'";
    Chart.defaults.global['defaultFontSize'] = 12;

    _.assign(Chart.defaults.global['tooltips'], {
        mode: 'nearest',
        cornerRadius: 0,
        backgroundColor: 'white',
        titleFontColor: '#1F5C63',
        bodyFontColor: '#1F5C63',
        footerFontColor: '#1F5C63',
        borderColor: '#86AAAE',
        borderWidth: 2,
        xPadding: 12,
        yPadding: 12,
        caretSize: 4,
        caretPadding: 8
    });

    _.assign(Chart.defaults.global['animation'], {
        duration: 0
    });
};


// PART Global tilewidget/drawer functions


Mqe.Tw.synchronizeAxesOfTpcreated = function(axis, tpcreatedTws) {
    var min, max;
    _.forEach(tpcreatedTws, function(twEl) {
       var tw = Mqe.Tw.createTilewidget($(twEl));
       if (!tw) {
           return;
       }
       var drawer = tw.createDrawer();
       var minMax = drawer.getAxisMinMax(axis);
       if (minMax) {
           if (_.isUndefined(min) || minMax[0] < min) {
               min = minMax[0];
           }
           if (_.isUndefined(max) || minMax[1] > max) {
               max = minMax[1];
           }
       }
    });
    if (!(_.isUndefined(min) || _.isUndefined(max))) {
        _.forEach(tpcreatedTws, function(twEl) {
            var tw = Mqe.Tw.createTilewidget($(twEl));
            if (!tw) {
                return;
            }
            var drawer = tw.createDrawer();
            drawer.setAxisMinMax(axis, min, max);
        });
    }
};

Mqe.Tw.synchronizeXAxesOfTpcreated = function(tpcreatedTws) {
    Mqe.Tw.synchronizeAxesOfTpcreated('x', tpcreatedTws);
};

Mqe.Tw.synchronizeYAxesOfTpcreated = function(tpcreatedTws) {
    Mqe.Tw.synchronizeAxesOfTpcreated('y', tpcreatedTws);
};



// PART tilewidget common


Mqe.Tw.createTilewidget = function(twEl) {
    if (_.isEmpty(twEl) || !('data' in $(twEl)) || _.isEmpty($(twEl).data('tileOptions'))) {
        //Mqe.log('Empty twEl', twEl);
        return null;
    }
    var tw_type = $(twEl).data('tileOptions').tw_type;
    if (!tw_type) {
        return null;
    }
    return new Mqe.Tw[tw_type](twEl);
};

Mqe.Tw.tilewidgetCyclicRefresh = function() {
    _.forEach($('.tw'), function(el) {
        var tw = Mqe.Tw.createTilewidget($(el));
        if (tw) {
            tw.cyclicRefresh();
        }
    });
};

Mqe.Tw.setupTilewidgetRefreshing = function() {
    var setupFun = function() {
        Mqe.Tw.tilewidgetCyclicRefresh();
        window.setTimeout(setupFun, 30000);
    };
    setupFun();
};



// PART Drawer base class


Mqe.Tw.Drawer = function(tw) {
    this.tw = tw;
};
Mqe.Tw.Drawer.prototype.drawFull = function() {
    throw 'NotImplementedError';
};
Mqe.Tw.Drawer.prototype.removeOldPoint = function(seriesIndex, pointIndex, point) {
    throw 'NotImplementedError';
};
Mqe.Tw.Drawer.prototype.removeOldPointCommit = function() {
    // do nothing
};
Mqe.Tw.Drawer.prototype.reflow = function() {
    // do nothing
};
Mqe.Tw.Drawer.prototype.getAxisMinMax = function(axis) {
    return null;
};
Mqe.Tw.Drawer.prototype.setAxisMinMax = function(axis, min, max) {
    // do nothing
};
Mqe.Tw.Drawer.prototype.destroy = function() {
    // do nothing
};
Mqe.Tw.Drawer.prototype.moveresizeStart = function() {
    Mqe.Db.TW_ELS_TO_RESIZE.push(this.tw.twEl.get(0));
};
Mqe.Tw.Drawer.prototype.moveresizeEnd = function() {
    _.pull(Mqe.Db.TW_ELS_TO_RESIZE, this.tw.twEl.get(0));
};



// PART ChartBaseDrawer

Mqe.Tw.ChartBaseDrawer = function(tw) {
    Mqe.Tw.Drawer.call(this, tw);
};
Mqe.Tw.ChartBaseDrawer.prototype = Object.create(Mqe.Tw.Drawer.prototype);
Mqe.Tw.ChartBaseDrawer.prototype.constructor = Mqe.Tw.ChartBaseDrawer;

Mqe.Tw.ChartBaseDrawer.prototype.commonChartConfig = function(type, datasetProps) {
    var combinedColors = this.tw.tileData()['combined_colors'];
    var config = {options: {}, data: {}};

    config['type'] = type;

    config['options']['responsive'] = true;
    config['options']['maintainAspectRatio'] = false;

    config['options']['layout'] = {
        padding: {
            top: 40,
            left: 15,
            right: 15,
            bottom: 15
        }
    };

    config['options']['legend'] = {
        position: 'bottom',
        labels: {
            boxWidth: 30,
            fontSize: 11,
            padding: 15,
            fontSize: 10
        }
    };

    config['data']['datasets'] = _.map(this.tw.tileData()['series_data'], function(series_data, idx) {
        var res = {};
        res['label'] = series_data['name'];

        var color = combinedColors[idx];

        if (datasetProps.fill && color.length == 7 && color[0] === '#') {
            var colorObject = new Color(color);
            colorObject.clearer(0.3);
            res['backgroundColor'] = colorObject.rgbaString();
        } else {
            res['backgroundColor'] = color;
        }

        res['borderColor'] = color;
        res['pointHitRadius'] = 15;
        res['data'] = _.map(series_data['data_points'], function(data_point) {
            if (type === 'line') {
                return {x: Mqe.getLocalizedMoment(data_point[1]), y: data_point[2]};
            } else {
                return data_point[2];
            }
        });
        _.assign(res, datasetProps);
        return res;
    });

    var hasAnyPoint = _.any(config['data']['datasets'], function(dataset) {
       return !_.isEmpty(dataset['data']);
    });

    config['options']['scales'] = {};
    if (type === 'line' && hasAnyPoint) {

        config['options']['scales']['xAxes'] = [{
            type: 'time',
            display: true,
            gridLines: {
                display: true,
                drawTicks: true,
                drawOnChartArea: false,
                lineWidth: 2
            },
            ticks: {
                autoSkipPadding: 10,
                maxRotation: 0
            },
            time: {
            }
        }];

        if (Mqe.dt_format !== 'us') {
            _.assign(config['options']['scales']['xAxes'][0]['time'], {
                displayFormats: {
                    millisecond: 'HH:mm:ss.SSS',
                    second: 'HH:mm:ss',
                    minute: 'HH:mm:ss',
                    hour: 'MMM D, HH:mm'
                }
            });
        }
    } else {
        config['options']['scales']['xAxes'] = [{
            display: false
        }];
    }

    config['options']['scales']['yAxes'] = [{
        display: true,
        ticks: {
            callback: function (value, index, values) {
                var valueStr = Chart.Ticks.formatters.linear(value, index, values);

                if (!_.isNumber(value)) {
                    return valueStr;
                }
                if (value < 1) {
                    return valueStr;
                }

                var millionsIdx = valueStr.lastIndexOf('000000');
                if (millionsIdx !== -1) {
                    return valueStr.substring(0, millionsIdx) + 'M';
                }

                var thousandsIdx = valueStr.lastIndexOf('000');
                if (thousandsIdx !== -1) {
                    return valueStr.substring(0, thousandsIdx) + 'K';
                }

                return valueStr;
            }
        }
    }];

    var yAxisMin = _.get(this.tw.tileData(), 'extra_options.y_axis_min');
    if (_.isNumber(yAxisMin)) {
        config['options']['scales']['yAxes'][0]['ticks']['beginAtZero'] = true;
    }
    var yAxisMax = _.get(this.tw.tileData(), 'extra_options.y_axis_max');
    if (_.isNumber(yAxisMax)) {
        config['options']['scales']['yAxes'][0]['ticks']['max'] = yAxisMax;
    }
    if (yAxisMin === 0 && yAxisMax === 1) {
        config['options']['scales']['yAxes'][0]['ticks']['maxTicksLimit'] = 2;
    }


    if (this.tw.tileData()['common_header']) {
        config['options']['scales']['yAxes'][0]['scaleLabel'] = {
            display: true,
            labelString: this.tw.tileData()['common_header']
        }
    }


    // set labels for bar charts
    if (type !== 'line') {
        var label = this.tw.tileData()['common_header'] || '';
        config['data']['labels'] = [label];
    }

    // revert axes for horizontalBar
    if (type === 'horizontalBar') {
        config['options']['scales']['xAxes'] = config['options']['scales']['yAxes'];
        delete config['options']['scales']['yAxes'];
    }

    // add a date to a tooltip's title
    var tw = this.tw;
    config['options']['tooltips'] = {
        callbacks: {
            title: function (tooltipItemArray, data) {
                var item = tooltipItemArray[0];
                var dataPoint = tw.tileData()['series_data'][item.datasetIndex]['data_points'][item.index];
                if (dataPoint)
                    return Mqe.formatDate(dataPoint[1]);
                return '';
            }
        }
    };

    return config;
};
Mqe.Tw.ChartBaseDrawer.prototype.destroy = function() {
    var chart = $(this.tw.twEl).data('chart');
    if (chart) {
        chart.destroy();
    }
};
Mqe.Tw.ChartBaseDrawer.prototype.createChart = function(config) {
    $(this.tw.twEl).html('<canvas></canvas>');
    var canvasEl = $('canvas', this.tw.twEl)[0];
    var ctx = canvasEl.getContext('2d');
    var chart = new Chart(ctx, config);
    $(this.tw.twEl).data('chart', chart);
};
Mqe.Tw.ChartBaseDrawer.prototype.chart = function() {
    return $(this.tw.twEl).data('chart');
};
Mqe.Tw.ChartBaseDrawer.prototype.getAxisMinMax = function(axis) {
    var scale = this.chart()['scales'][axis+'-axis-0'];
    if (!scale) {
        return null;
    }
    return [scale.min, scale.max];
};
Mqe.Tw.ChartBaseDrawer.prototype.setAxisMinMax = function(axis, min, max) {
    var scale = this.chart()['scales'][axis+'-axis-0'];

    var axisObject = this.chart()['options']['scales'][axis+'Axes'][0];
    if (axis == 'y') {
        axisObject['ticks']['min'] = min;
        axisObject['ticks']['max'] = max;
    } else if (axisObject['time']) {
        axisObject['time']['min'] = min;
        axisObject['time']['max'] = max;
    }

    this.chart().update();
};



// PART ChartRangeDrawer


Mqe.Tw.ChartRangeDrawer = function(tw) {
    Mqe.Tw.ChartBaseDrawer.call(this, tw);
};
Mqe.Tw.ChartRangeDrawer.prototype = Object.create(Mqe.Tw.ChartBaseDrawer.prototype);
Mqe.Tw.ChartRangeDrawer.prototype.constructor = Mqe.Tw.ChartRangeDrawer;

Mqe.Tw.ChartRangeDrawer.prototype.drawFull = function() {
    var chartType = this.tw.getTileOptions()['chart_type'];

    var datasetProps;
    if (chartType === 'line') {
        datasetProps = {
            fill: false,
            lineTension: 0
        };
    } else if (chartType == 'area' || chartType == 'areastacked') {
        datasetProps = {
            fill: true,
            lineTension: 0
        }
    } else if (chartType == 'spline') {
        datasetProps = {
            fill: false,
            lineTension: 0.4
        }
    } else if (chartType == 'areaspline') {
        datasetProps = {
            fill: true,
            lineTension: 0.4
        }
    } else {
        datasetProps = {};
    }

    var config = this.commonChartConfig('line', datasetProps);

    if (chartType == 'areastacked') {
        config['options']['scales']['yAxes'][0]['stacked'] = true;
    }

    this.createChart(config);
};
Mqe.Tw.ChartRangeDrawer.prototype.removeOldPoint = function(seriesIndex, pointIndex, point) {
    _.pullAt(this.chart().data.datasets[seriesIndex].data, [pointIndex]);
};
Mqe.Tw.ChartRangeDrawer.prototype.removeOldPointCommit = function() {
    this.chart().update();
};
Mqe.Tw.ChartRangeDrawer.prototype.reflow = function() {
};
Mqe.Tw.ChartRangeDrawer.prototype.moveresizeStart = function() {
    Mqe.Tw.Drawer.prototype.moveresizeStart.call(this);
};
Mqe.Tw.ChartRangeDrawer.prototype.moveresizeEnd = function() {
    Mqe.Tw.Drawer.prototype.moveresizeEnd.call(this);
};



// PART ChartSingleDrawer


Mqe.Tw.ChartSingleDrawer = function(tw) {
    Mqe.Tw.ChartBaseDrawer.call(this, tw);
};
Mqe.Tw.ChartSingleDrawer.prototype = Object.create(Mqe.Tw.ChartBaseDrawer.prototype);
Mqe.Tw.ChartSingleDrawer.prototype.constructor = Mqe.Tw.ChartSingleDrawer;

Mqe.Tw.ChartSingleDrawer.prototype.drawFull = function() {
    var chartType = this.tw.getTileOptions()['chart_type'];

    var type;
    if (chartType === 'column') {
        type = 'horizontalBar';
    } else if (chartType === 'bar') {
        type = 'bar'
    }

    var config = this.commonChartConfig(type, {});
    this.createChart(config);

};
Mqe.Tw.ChartSingleDrawer.prototype.removeOldPoint = function(seriesIndex, pointIndex, point) {
    // do nothing
};
Mqe.Tw.ChartSingleDrawer.prototype.removeOldPointCommit = function() {
    // do nothing
};
Mqe.Tw.ChartSingleDrawer.prototype.reflow = function() {
};
Mqe.Tw.ChartSingleDrawer.prototype.moveresizeStart = function() {
    Mqe.Tw.Drawer.prototype.moveresizeStart.call(this);
};
Mqe.Tw.ChartSingleDrawer.prototype.moveresizeEnd = function() {
    Mqe.Tw.Drawer.prototype.moveresizeEnd.call(this);
};




// PART TextTableDrawer


Mqe.Tw.TextTableDrawer = function(tw) {
    Mqe.Tw.Drawer.call(this, tw);
};
Mqe.Tw.TextTableDrawer.prototype = Object.create(Mqe.Tw.Drawer.prototype);
Mqe.Tw.TextTableDrawer.prototype.constructor = Mqe.Tw.TextTableDrawer;

Mqe.Tw.TextTableDrawer.prototype.drawFull = function() {
    this.tw.twEl.closest('.grid-stack-item-content').css({backgroundColor: 'white'});
    this.tw.twEl.html(this.tw.tileData()['drawer_html']);
    var that = this;
    $('table thead td', this.tw.twEl).click(function() {
        var tdIndex = $(this).index();
        var sortState = that._getSortState();
        if (sortState === null) {
            console.warn('sortState null');
            return;
        }
        if (sortState[0] === tdIndex) {
            that._drawSortArrow(tdIndex, sortState[1] === 'asc' ? 'desc' : 'asc');
        } else {
            that._drawSortArrow(tdIndex, 'desc');
        }
        that._sort();
    });
};
Mqe.Tw.TextTableDrawer.prototype._SORT_ICON_DESC = '<i class="sort-icon fa fa-caret-down fa-lg"></i>';
Mqe.Tw.TextTableDrawer.prototype._SORT_ICON_ASC = '<i class="sort-icon fa fa-caret-up fa-lg"></i>';
Mqe.Tw.TextTableDrawer.prototype._drawSortArrow = function(tdIndex, direction) {
    var tableEl = $('table', this.tw.twEl);
    $('.sort-icon', tableEl).remove();
    var td = $('thead td', tableEl).get()[tdIndex];
    if (direction === 'desc') {
        $(td).append(this._SORT_ICON_DESC);
    } else {
        $(td).append(this._SORT_ICON_ASC);
    }
};
Mqe.Tw.TextTableDrawer.prototype._getSortState = function() {
    var i = $('table thead i.sort-icon', this.tw.twEl);
    if (_.isEmpty(i)) {
        return null;
    }

    var direction;
    if ($(i).hasClass('fa-caret-down')) {
        direction = 'desc';
    } else if ($(i).hasClass('fa-caret-up')) {
        direction = 'asc';
    } else {
        console.error('Unknown icon', i);
    }

    return [$(i).closest('td').index(), direction];
};
Mqe.Tw.TextTableDrawer.prototype._makeCompareTrsFun = function() {
    var sortState = this._getSortState();
    var getTdKey = function(currTd) {
        var numericValue = currTd.data('numericValue');
        if (!_.isUndefined(numericValue)) {
            return numericValue;
        }
        var text = _.trim(currTd.text());
        try {
            return JSON.parse(text);
        } catch (e) {}

        var num = parseFloat(text);
        if (!_.isNaN(num)) {
            return num;
        }

        return text;
    };
    var getTd = function(tr) {
        return $($(tr).find('td').get()[sortState[0]]);
    };
    return function(tr1, tr2) {
        var k1 = getTdKey(getTd(tr1));
        var k2 = getTdKey(getTd(tr2));
        //Mqe.log('keys', k1, k2);
        if (sortState[1] === 'asc') {
            return Mqe.compareArrays([k1], [k2]);
        } else {
            return Mqe.compareArrays([k2], [k1]);
        }
    };
};
Mqe.Tw.TextTableDrawer.prototype._sort = function() {
    var trs = $('table tbody tr', this.tw.twEl);
    var trArr = trs.get();
    trArr.sort(this._makeCompareTrsFun());
    trs.remove();
    $('table tbody', this.tw.twEl).append(trArr);
};
Mqe.Tw.TextTableDrawer.prototype.removeOldPoint = function(seriesIndex, pointIndex, point) {
    //Mqe.log('removeOldPoint', seriesIndex, pointIndex);
    var tr = _.find($('table tbody tr', this.tw.twEl), function(currTr) {
        //Mqe.log('tr lookup', $(currTr).data('id'), point[0], $(currTr));
        return _.isEqual($(currTr).data('id'), point[0]);
    });
    if (!tr) {
        console.error('No tr found');
        return;
    }
    var td = _.find($(tr).find('td'), function(currTd) {
        return $(currTd).data('seriesIndex') === seriesIndex;
    });
    if (!td) {
        console.error('Cannot find td for seriesIndex', seriesIndex);
        return;
    }
    $(td).html('').data('isCleared', true);
    var allEmpty = _.every($(tr).find('td').get().slice(1), function(currTd) {
        return $(currTd).data('isCleared') || !$(currTd).data('filled');
    });
    if (allEmpty) {
        $(tr).remove();
    }
};
Mqe.Tw.TextTableDrawer.prototype.removeOldPointCommit = function() {
    // do nothing
};




// PART TextSingleDrawer


Mqe.Tw.TextSingleDrawer = function(tw) {
    Mqe.Tw.Drawer.call(this, tw);
};
Mqe.Tw.TextSingleDrawer.prototype = Object.create(Mqe.Tw.Drawer.prototype);
Mqe.Tw.TextSingleDrawer.prototype.constructor = Mqe.Tw.TextSingleDrawer;

Mqe.Tw.TextSingleDrawer.prototype.drawFull = function() {
    this.tw.twEl.closest('.grid-stack-item-content').css({backgroundColor: 'white'});
    this.tw.twEl.html(this.tw.tileData()['drawer_html']);
    this.reflow();
};
Mqe.Tw.TextSingleDrawer.prototype.removeOldPoint = function(seriesIndex, pointIndex, point) {
    // do nothing
};
Mqe.Tw.TextSingleDrawer.prototype.removeOldPointCommit = function() {
    // do nothing
};
Mqe.Tw.TextSingleDrawer.prototype.reflow = function() {
    var textEl = $('.tile-data-single-text-wrap', this.tw.twEl);
    if (textEl.length) {
        Mqe.enlargeUntilOverflow(textEl[0]);
        // do it twice
        //Mqe.enlargeUntilOverflow(textEl[0]);
    }
    var singleSeriesPoints = $('.single-series-point', this.tw.twEl);
    if (_.isEmpty(singleSeriesPoints)) {
        return;
    }
    //var ssTop = $(singleSeriesPoints[0]).position().top;
    var ssLast = $(_.last(singleSeriesPoints));
    var ssBottom = Mqe.offsetBottom(ssLast);
    var containerBottom = Mqe.offsetBottom($('.tile-data-single-text-wrap', this.tw.twEl));
    var marginTop = (containerBottom - ssBottom) / 2;
    if (marginTop >= 1) {
        $(singleSeriesPoints[0]).css('margin-top', marginTop - 1);
    }
};




// PART Tilewidget base class


Mqe.Tw.Tilewidget = function(twEl) {
    this.twEl = twEl;
};
Mqe.Tw.Tilewidget.prototype.createDrawer = function() {
    var drawer_type = this.getTileOptions()['drawer_type'];
    return new Mqe.Tw[drawer_type](this);
};
Mqe.Tw.Tilewidget.prototype.draw = function() {
    this.setTitle();
    this.createDrawer().drawFull();

    if (Mqe.Db.isMasterTile(this.twEl) || Mqe.Db.masterTileIdGroup(this.twEl)) {
        Mqe.Db.synchronizeTpcreated(this.twEl);
    }
};
Mqe.Tw.Tilewidget.prototype.fillTileConfig = function(modalEl, tile_config) {
    if (this.getTileOptions()['tpcreator_data']) {
        tile_config['tile_options']['tpcreator_data'] = _.cloneDeep(this.getTileOptions()['tpcreator_data']);
    }

    var enteredTitle = _.trim($('input[name=graph-title]', modalEl).val());
    if (enteredTitle !== this.getAutogeneratedTitle()) {
        tile_config['tile_options']['tile_title'] = enteredTitle;
    }

    var colors = _.map($('.graph-color-wrap input[type=color]', modalEl), function(el) {
        var colorValue = $(el).val();
        if (!_.startsWith(colorValue, '#')) {
            colorValue = '#'+colorValue;
        }
        return colorValue;
    });
    tile_config['tile_options']['colors'] = colors;
};
Mqe.Tw.Tilewidget.prototype.getAutogeneratedTitle = function() {
    if (_.isEmpty(this.tileData())) {
        // loading state
        return '?';
    }

    var baseTitle = _.get(this.getTileOptions(), 'tpcreator_data.tile_title_base') ||
        this.tileData()['generated_tile_title'];
    if (_.isEmpty(this.tileData()['generated_tile_title_postfix'])) {
        return baseTitle;
    }
    return baseTitle+' '+this.tileData()['generated_tile_title_postfix'];
};
Mqe.Tw.Tilewidget.prototype.getTitle = function() {
    if (!_.isEmpty(this.getTileOptions()['tile_title'])) {
        return this.getTileOptions()['tile_title'];
    }
    return this.getAutogeneratedTitle();
};
Mqe.Db._re_tile_with_tag = /(.*?)\[(.+)\]\s*$/;
Mqe.Tw.Tilewidget.prototype.setTitle = function() {
    var chartTitle = this.getTitle();

    var textPart = chartTitle;
    var htmlPart = '';

    var fullHtml = Mqe.escapeHtml(textPart) + htmlPart;
    var link = _.get(this.tileData(), 'latest_extra_ri_data.link');
    if (!_.isEmpty(link)) {
        fullHtml = '<a class=tw-user-link rel=nofollow href="'+link+'">'+fullHtml+'</a>';
    }

    $('.tw-chart-title', this.twEl.parent())
        .html(fullHtml)
        .attr('title', chartTitle);
};
Mqe.Tw.Tilewidget.prototype.tileData = function() {
    return this.twEl.data('tileData');
};
Mqe.Tw.Tilewidget.prototype.setTileDataKey = function(key, value) {
    var d = this.twEl.data('tileData');
    d[key] = value;
    this.twEl.data('tileData', d);
};
Mqe.Tw.Tilewidget.prototype.getTileOptions = function() {
    return this.twEl.data('tileOptions');
};
Mqe.Tw.Tilewidget.prototype.fillTileSettings = function(modalEl) {
    $('input[name=graph-title]', modalEl).val(this.getTitle());

    _.forEach(this.getTileOptions()['colors'], function(c) {
        Mqe.Db.addTileSettingsColor(modalEl, c);
    });
};
Mqe.Tw.Tilewidget.prototype.cyclicRefresh = function() {
    var currentMillis = Mqe.currentMillisUTC();
    var minMillis = currentMillis - (this.getTileOptions()['seconds_back'] * 1000);
    var removed = false;
    var that = this;
    var drawer = this.createDrawer();
    _.forEach(that.tileData()['series_data'], function(s, seriesIndex) {
        var toRemove = [];
        for (var i = 0; i < s['data_points'].length; ++i) {
            var point = s['data_points'][i];
            //Mqe.log('point', point, 'minMillis', minMillis);
            if (point[1] < minMillis) {
                toRemove.push([i, point]);
            } else {
                break;
            }
        }
        if (!_.isEmpty(toRemove)) {
            _.forEachRight(toRemove, function(ar) {
                drawer.removeOldPoint(seriesIndex, ar[0], ar[1]);
                that.tileData()['series_data'][seriesIndex]['data_points'].splice(ar[0], 1);
            });
            removed = true;
        }
    });
    if (removed) {
        drawer.removeOldPointCommit();
    }
};
Mqe.Tw.Tilewidget.prototype.destroy = function() {
    this.createDrawer().destroy();
};
Mqe.Tw.Tilewidget.prototype.newestDataTimestamp = function() {
    var candidates = [];
    _.forEach(this.tileData()['series_data'], function(seriesData) {
        if (!_.isEmpty(seriesData['data_points'])) {
            candidates.push(_.last(seriesData['data_points'])[1]);
        }
    });
    if (_.isEmpty(candidates)) {
        return null;
    }
    return _.max(candidates);
};




// PART Tilewidget Range


Mqe.Tw.Range = function(twEl) {
    Mqe.Tw.Tilewidget.call(this, twEl);
};
Mqe.Tw.Range.prototype = Object.create(Mqe.Tw.Tilewidget.prototype);
Mqe.Tw.Range.prototype.constructor = Mqe.Tw.Range;

Mqe.Tw.Range.prototype.fillTileSettings = function(modalEl) {
    Mqe.Tw.Tilewidget.prototype.fillTileSettings.call(this, modalEl);

    var drawer_type = this.getTileOptions()['drawer_type'];
    // !!! remove
    if (_.isEmpty(drawer_type)) {
        drawer_type = 'ChartRangeDrawer';
    }

    var visualization_option = drawer_type;
    if (drawer_type === 'ChartRangeDrawer') {
        visualization_option += '.' + this.getTileOptions()['chart_type'];
    } else if (drawer_type === 'TextTableDrawer') {
        // do nothing
    } else {
        console.error('Invalid drawer_type', drawer_type);
    }
    $('.range-drawer-select', modalEl).val(visualization_option);

    $('input[name=tw-type-range-numback]', modalEl).val(this.getTileOptions()['num_back']);
    $('.back-unit', modalEl).val(this.getTileOptions()['back_unit']);
};
Mqe.Tw.Range.prototype.fillTileConfig = function(modalEl, tile_config) {
    Mqe.Tw.Tilewidget.prototype.fillTileConfig.call(this, modalEl, tile_config);

    tile_config['tw_type'] = 'Range';

    var visualization_option = $('.range-drawer-select option:selected', modalEl).val();
    tile_config['tile_options']['drawer_type'] = visualization_option.split('.')[0];
    if (tile_config['tile_options']['drawer_type'] === 'ChartRangeDrawer') {
        tile_config['tile_options']['chart_type'] = visualization_option.split('.')[1];
    }

    var backParams = Mqe.Db.getBackParams(modalEl);
    _.assign(tile_config['tile_options'], backParams);
};




// PART Tilewidget Single


Mqe.Tw.Single = function(twEl) {
    Mqe.Tw.Tilewidget.call(this, twEl);
};
Mqe.Tw.Single.prototype = Object.create(Mqe.Tw.Tilewidget.prototype);
Mqe.Tw.Single.prototype.constructor = Mqe.Tw.Single;

Mqe.Tw.Single.prototype.fillTileSettings = function(modalEl) {
    Mqe.Tw.Tilewidget.prototype.fillTileSettings.call(this, modalEl);

    var drawer_type = this.getTileOptions()['drawer_type'];
    // !!! remove
    if (_.isEmpty(drawer_type)) {
        drawer_type = 'ChartSingleDrawer';
    }

    var visualization_option = drawer_type;
    if (drawer_type === 'ChartSingleDrawer') {
        visualization_option += '.' + this.getTileOptions()['chart_type'];
    } else if (drawer_type === 'TextSingleDrawer') {
        // do nothing
    } else {
        console.error('Invalid drawer_type', drawer_type);
    }
    $('.single-drawer-select', modalEl).val(visualization_option);
};
Mqe.Tw.Single.prototype.fillTileConfig = function(modalEl, tile_config) {
    Mqe.Tw.Tilewidget.prototype.fillTileConfig.call(this, modalEl, tile_config);

    tile_config['tw_type'] = 'Single';

    var visualization_option = $('.single-drawer-select option:selected', modalEl).val();
    tile_config['tile_options']['drawer_type'] = visualization_option.split('.')[0];
    //Mqe.log('drawer_type', tile_config['tile_options']['drawer_type']);
    if (tile_config['tile_options']['drawer_type'] === 'ChartSingleDrawer') {
        tile_config['tile_options']['chart_type'] = visualization_option.split('.')[1];
    }
};


