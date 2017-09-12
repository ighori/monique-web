/*jshint -W069 */

Mqe.Db = {};

Mqe.Db.GRIDSTACK_COLS = 12;



// PART Common

Mqe.Db.tileIdOfGridstackItem = function(gsEl) {
  return JSON.parse($(gsEl).attr('data-tile-id'));
};

Mqe.Db.findGridstackItem = function(tileId) {
    return $(_.find($('.grid-stack-item'), function(gsEl) {
        return _.isEqual(Mqe.Db.tileIdOfGridstackItem(gsEl), tileId);
    }));
};

Mqe.Db.twElForModal = function(modalEl) {
    var gsEl = Mqe.Db.findGridstackItem(modalEl.data('tileId'));
    return $('.tw', gsEl);
};

Mqe.Db.grid = function() {
    return $('.grid-stack').data('gridstack');
};

Mqe.Db.getDashboardId = function() {
    return $('.grid-stack[data-dashboard-id]').data('dashboardId');
};

Mqe.Db.getCurrentDashboardName = function() {
    return $('.db-tab-active').data('dashboardName');
};

Mqe.Db.findDbTab = function(dashboardId) {
    var dbTab = _.find($('.db-tab'), function(el) {
        return _.isEqual($(el).data('dashboardId'), dashboardId);
    });
    return dbTab;
};

Mqe.Db.isProfilePage = function() {
    return !_.isEmpty($('.profile-link-active'));
};

Mqe.Db.toDisplayableString = function(v) {
    return Mqe.postprocessJSONRich(v);
};

Mqe.Db.getDashboardOptions = function() {
    var activeTab = $('.db-tab.db-tab-active');
    var dashboardOptions = JSON.parse(activeTab.attr('data-dashboard-options'));
    return dashboardOptions;
};

Mqe.Db.cleanupTileResources = function(gsEl) {
    Mqe.stopLoadingAnimation($('.waiting-for-load', gsEl));
    var tw = Mqe.Tw.createTilewidget($('.tw', gsEl));
    if (tw) {
        tw.destroy();
    }
    var twEl = $('.tw', gsEl);
    twEl.removeData('tileData');
    twEl.removeData('tileOptions');
    twEl.data('inStateLoading', false);
    twEl.data('inStateRendering', false);
};

Mqe.Db.cleanupTiles = function() {
    _.forEach($('.grid-stack-item'), Mqe.Db.cleanupTileResources);
    var grid = Mqe.Db.grid();
    if (grid) {
        grid.destroy();
    }
};

Mqe.Db.setLayoutId = function(currentDashboardId, newLayoutId) {
    // check if dashboard wasn't switched during ajax call
    if (_.isEqual(currentDashboardId, $('.grid-stack[data-dashboard-id]').data('dashboardId'))) {
        $('.grid-stack[data-dashboard-id]').attr('data-layout-id', JSON.stringify(newLayoutId));
    }
};

Mqe.Db.getLayoutId = function() {
    return JSON.parse($('.grid-stack[data-dashboard-id]').attr('data-layout-id'));
};

Mqe.Db.reloadDashboardContent = function() {
    var currentActiveTab = $('.db-tab.db-tab-active');
    Mqe.Db.loadDashboard(currentActiveTab);
};

Mqe.Db.getBackParams = function(contextEl) {
    var res = {};
    res.num_back = parseFloat($('input[name=tw-type-range-numback]', contextEl).val());
    res.back_unit = $('.back-unit', contextEl).val();
    var seconds = res.num_back;
    if (res.back_unit === 'days') {
        seconds *= 86400;
    } else if (res.back_unit === 'hours') {
        seconds *= 3600;
    } else if (res.back_unit === 'minutes') {
        seconds *= 60;
    } else {
        console.error('Unknown unit', res.back_unit);
    }
    res.seconds_back = seconds;
    return res;
};

Mqe.Db.setupGlobalKeyBindings = function() {
    $(document).keyup(function(e) {
        if (e.keyCode === 27) {
            // escape
            if ($('#db-action-fullscreen').hasClass('db-action-active')) {
                $('#db-action-fullscreen').click();
            }
        }
    });
};

Mqe.Db.setupTouchDevice = function() {
    if (!Mqe.touchScreen()) {
        Mqe.createStyle(Mqe.cssDef('.tw-icon-settings-visibility',
            ['opacity: 0.01',
                'transition: opacity .25s ease-in-out',
                '-webkit-backface-visibility: hidden']));
    }
};

Mqe.Db.isMasterTile = function(twEl) {
    return !_.isEmpty(_.get(twEl.data('tileOptions'), 'tpcreator_uispec'));
};

Mqe.Db.masterTileIdGroup = function(twEl) {
    var masterTileId = _.get(twEl.data('tileOptions'), 'tpcreator_data.master_tile_id');
    if (!_.isEmpty(masterTileId)) {
        return masterTileId;
    }
    // is it the master tile?
    if (_.isEmpty(_.get(twEl.data('tileOptions'), 'tpcreator_uispec'))) {
        return null;
    }
    return Mqe.Db.tileIdOfGridstackItem($(twEl).closest('.grid-stack-item'));
};



// PART Gridstack


Mqe.Db.setupGridstack = function() {
    var options = {
        //float: true,
        min_width: 768,
        always_show_resize_handle: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        resizable: { handles: 'se, sw' },
        vertical_margin: 8,
        animate: true
    };
    $('.grid-stack').gridstack(options);
    Mqe.Db.setupGridstackEvents();
};

Mqe.Db.setupGridstackEvents = function() {
    $('.grid-stack').off('change');
    $('.grid-stack').on('change', function (e, items) {
        Mqe.log('Changed items', items);
        if (Mqe.State.IGNORE_NEXT_GRIDSTACK_EVENT) {
            Mqe.log('Ignoring gridstack event');
            Mqe.State.IGNORE_NEXT_GRIDSTACK_EVENT = false;
            return;
        }
        window.setTimeout(function() {
            _.forEach(items, function(item) {
                var twEl = $('.tw', $(item.el));
                if (twEl.data('inStateRendering')) {
                    return;
                }
                var tw = Mqe.Tw.createTilewidget(twEl);
                if (tw) {
                    var drawer = tw.createDrawer();
                    drawer.reflow();
                }
            });
        }, 350);
    });

    var onMoveresizeStart = function(event, ui) {
        var twEl = $('.tw', event.target);
        if (twEl.data('inStateRendering')) {
            return;
        }
        var tw = Mqe.Tw.createTilewidget(twEl);
        if (tw) {
            var drawer = tw.createDrawer();
            drawer.moveresizeStart();
        }
    };

    var onMoveresizeEnd = function(event, ui) {

        // this will be restored in saveTilesVisualOptions
        $(event.target).mouseleave();
        Mqe.Db.grid().disable();
        $('#db-action-moveresize').addClass('db-action-disabled');
        $('#db-action-moveresize').css('pointerEvents', 'none');

        var gsEl = $(event.target);
        var twEl = $('.tw', gsEl);
        var tileId = Mqe.Db.tileIdOfGridstackItem(gsEl);

        var master_tile_id_resized;
        if (Mqe.Db.isMasterTile(twEl)) {
            master_tile_id_resized = tileId;
        } else {
            master_tile_id_resized = null;
        }

        window.setTimeout(function() {
            Mqe.Db.saveTilesVisualOptions(master_tile_id_resized);
        }, 500);

        if (twEl.data('inStateRendering')) {
            return;
        }
        var tw = Mqe.Tw.createTilewidget(twEl);
        if (tw) {
            var drawer = tw.createDrawer();
            drawer.moveresizeEnd();
        }
    };

    $('.grid-stack').off('dragstart dragstop resizestart resizestop');
    $('.grid-stack').on('dragstart', onMoveresizeStart);
    $('.grid-stack').on('dragstop', onMoveresizeEnd);
    $('.grid-stack').on('resizestart', onMoveresizeStart);
    $('.grid-stack').on('resizestop', onMoveresizeEnd);
};




// PART saving layout


Mqe.Db.getLayoutData = function() {
    var gsEl = $('.grid-stack');
    var data = _.map($('.grid-stack-item:visible', gsEl), function(el) {
        el = $(el);
        var node = el.data('_gridstack_node');

        // take original-visual-options as the base data, and overwrite it
        // with the current values
        var visualOptions = JSON.parse(el.attr('data-original-visual-options'));
        visualOptions.x = node.x;
        visualOptions.y = node.y;
        visualOptions.width = node.width;
        visualOptions.height = node.height;

        return [JSON.parse(el.attr('data-tile-id')), visualOptions];
    });
    return _.sortBy(data, function(e) {
        return (e[1].y * Mqe.Db.GRIDSTACK_COLS) + e[1].x;
    });
};

Mqe.Db.saveTilesVisualOptions = function(master_tile_id_resized) {
    if (_.isUndefined(master_tile_id_resized)) {
        master_tile_id_resized = null;
    }

    var dashboardId = $('.grid-stack[data-dashboard-id]').data('dashboardId');
    var data = Mqe.Db.getLayoutData();

    Mqe.ajaxJSON('/a/set_layout', {
        dashboard_id: dashboardId,
        layout_id: Mqe.Db.getLayoutId(),
        master_tile_id_resized: master_tile_id_resized,
        data: data
    }, function(resp) {
        Mqe.Db.grid().enable();

        // make sure the cursors are refreshed
        $('#db-action-moveresize').removeClass('db-action-disabled');
        $('#db-action-moveresize').css('pointerEvents', 'auto');
        _.forEach(document.querySelectorAll(':hover'), function(el) {
            if ($(el).hasClass('grid-stack-item')) {
                $(el).mouseenter();
                return false;
            }
        });

        if (_.isEmpty(resp['result']['new_layout_id'])) {
            Mqe.Messagebox.show('Refresh needed', 'A newer version of the dashboard\'s content is available. Please refresh the page.');
        } else {
            Mqe.Db.setLayoutId(dashboardId, resp['result']['new_layout_id']);
        }

        if (resp['result']['reload_required']) {
            Mqe.Db.reloadDashboardContent();
        }
    });
};



// PART tile drawing


Mqe.Db.drawSingleTile = function(gsEl, after) {
    var twEl = $('.tw', gsEl);
    twEl.data('inStateLoading', true);
    twEl.data('inStateRendering', true);
    $('.tw-icon-settings', gsEl).removeClass('clickable');
    twEl.html(Mqe.getPrepared($('.waiting-for-load'), false));
    $('.waiting-for-load', twEl).fadeIn(1000);
    var tileId = Mqe.Db.tileIdOfGridstackItem(gsEl);
    Mqe.ajaxJSON('/a/fetch_tile_data', {
        dashboard_id: $('.grid-stack[data-dashboard-id]').data('dashboardId'),
        tile_id: tileId
    }, function(fetchResp, textStatus) {
        if (_.isEmpty(twEl) || _.isEmpty(gsEl)) {
            Mqe.log('twEl became empty during fetch_tile_data');
            return;
        }
        if (!_.isEqual(tileId, Mqe.Db.tileIdOfGridstackItem(gsEl))) {
            Mqe.log('tileId mismatch in drawSingleTile');
            twEl.html(Mqe.getPrepared($('.tile-not-found-error')));
            twEl.data('inStateLoading', false);
            twEl.data('inStateRendering', false);
            return;
        }

        Mqe.stopLoadingAnimation($('.waiting-for-load', twEl));
        twEl.data('inStateLoading', false);
        $('.tw-icon-settings', gsEl).addClass('clickable');
        if (textStatus === 'success' && fetchResp['success']) {
            var tileData = fetchResp['result']['data'];
            tileData = Mqe.postprocessJSON(tileData);
            twEl.data('tileData', tileData);
            twEl.data('tileOptions', fetchResp['result']['tile_options']);

            if (_.isEmpty(fetchResp['result']['tile_options']['tpcreator_uispec'])) {
                twEl.closest('.grid-stack-item-content').removeClass('master-content');
            } else {
                if (Mqe.Db.isProfilePage()) {
                    twEl.closest('.grid-stack-item-content').addClass('master-content');
                }
            }

            var tw = Mqe.Tw.createTilewidget(twEl);
            gsEl.attr('data-tw-type', twEl.data('tileOptions')['tw_type']);
            gsEl.attr('data-drawer-type', twEl.data('tileOptions')['drawer_type']);
            tw.draw();

            twEl.data('inStateRendering', false);
            Mqe.callIfDefined(after);

        } else {
            twEl.data('inStateRendering', false);

            if (fetchResp['result'] === 'NO_TILE_FOUND') {
                twEl.html(Mqe.getPrepared($('.tile-not-found-error')));
            } else {
                twEl.html(Mqe.getPrepared($('.loading-error')));
            }
        }
    }, false);
};

Mqe.Db.drawTiles = function() {
    var tiles = _.sortBy($('.tile'), function(el) {
        return parseInt($(el).attr('data-gs-x')) + (parseInt($(el).attr('data-gs-y')) * Mqe.Db.GRIDSTACK_COLS);
    });
    _.forEach(tiles, function(tileEl) {
        Mqe.Db.drawSingleTile($(tileEl));
    });
};




// PART db tabs ordering


Mqe.Db.setupDbTabsOrdering = function() {
    Mqe.log('setupDbTabsOrdering');
    $('.db-tablist-tabs').sortable({
        // placeholder: 'db-tab-drop-placeholder'
        distance: 20
    });

    $('.db-tablist').off('sortupdate');
    $('.db-tablist').on('sortupdate', function(event, ui) {
        var dashboardIdList = _.map($('.db-tab'), function(el) {
            return $(el).data('dashboardId');
        });
        Mqe.ajaxJSON('/a/change_dashboard_ordering', {
            dashboard_id_list: dashboardIdList
        });
    });
};




// PART adding a dashboard


Mqe.Db.setupAddDashboard = function() {
    var modalEl = $('#modal-add-dashboard');
    var cleanupModal = function() {
        $('#modal-add-dashboard input[type="text"]').val('');
        $('#modal-add-dashboard .modal-message-message').html('');
        $('#modal-add-dashboard .modal-message').slideUp();
    };
    $('.db-add-dashboard').click(function() {
        Mqe.showModal(modalEl, cleanupModal);
        Mqe.maybeFocus($('#add-dashboard-name'));
    });

    var doAdd = function() {
        var name = _.trim($('#add-dashboard-name').val());
        Mqe.ajaxJSON('/a/add_dashboard', {
            name: name
        }, function(resp) {
            if (resp['success']) {
                Mqe.closeModal();
                $(resp['result']['html']).insertAfter($('.db-tabbar .db-tab:last'));
                $('.db-tab:last').animate({width: 'toggle'}, 250, function() {
                    $(this).removeClass('displaynone');
                    Mqe.Db.setupDbTabsOrdering();
                });
            } else {
                Mqe.showModalMessage($('#modal-add-dashboard'), resp['details']['message']);
            }
        });
    };

    $('#add-dashboard-name', modalEl).keyup(function(ev) {
        if (ev.keyCode === 13) {
            doAdd();
        }
    });

    $('#add-dashboard-button').click(doAdd);
};




// PART adding a report


Mqe.Db.seriesSpecFromDiv = function(seriesSpecDiv) {
    var ss = $(seriesSpecDiv);

    var res = {'__type__': 'SeriesSpec'};

    _.assign(res, JSON.parse(ss.attr('data-hidden-params')));

    var dataColumnSpec = JSON.parse($('.data-select option:selected', ss).val());
    res.data_colno = dataColumnSpec.idx;
    res.data_column_header = dataColumnSpec.header;

    var allHeaders = JSON.parse($('.data-select', ss).attr('data-all-headers'));
    if (!_.isEmpty(allHeaders) && res.data_colno < allHeaders.length) {
        res.data_column_header_for_name = allHeaders[res.data_colno];
    }

    var filteringColumnSpec;
    if (!_.isEmpty($('.filtering-select option:selected', ss))) {
        filteringColumnSpec = JSON.parse($('.filtering-select option:selected', ss).val());
    } else {
        filteringColumnSpec = null;
    }

    if (filteringColumnSpec) {
        res.filtering_colno = filteringColumnSpec.idx;
        res.filtering_column_header = filteringColumnSpec.header;
        res.filtering_expr = {
            op: $('.filtering-ops-select option:selected', ss).val(),
            args: [_.trim($('.filtering-expr-input', ss).val())]
        };
    } else {
        res.filtering_colno = null;
        res.filtering_column_header = null;
        res.filtering_expr = null;
    }
    res.name = _.trim($('.series-spec-name-input', ss).val());
    return res;
};

Mqe.Db.findTd = function(rowno, colno, modalEl) {
    return $('.parsing-result-table-wrap td[data-rowno='+rowno+'][data-colno='+colno+']', modalEl);
};

Mqe.Db.unclickTd = function(td) {
    td.removeClass('td-clicked');
    var rowno = JSON.parse(td.attr('data-rowno'));
    var colno = JSON.parse(td.attr('data-colno'));
    var tr = td.closest('tr');
    _.forEach(tr.find('.td-highlighted'), function(otherTd) {
        otherTd = $(otherTd);
        otherTd.data('becauseOfColnos', _.without(otherTd.data('becauseOfColnos'), colno));
        if (otherTd.data('becauseOfColnos').length === 0) {
            otherTd.removeClass('td-highlighted');
            otherTd.removeData('becauseOfColnos');
        }
    });
};

Mqe.Db.setupSeriesSpecDeleting = function(modalEl) {
    $('.series-spec-wrap', modalEl).on('click', '.series-spec-delete', function() {
        var ss = $(this).closest('.series-spec');
        if (ss.data('sampledFrom')) {
            var td = Mqe.Db.findTd(ss.data('sampledFrom').rowno, ss.data('sampledFrom').colno, modalEl);
            if (!_.isEmpty(td) && td.hasClass('td-clicked')) {
                Mqe.Db.unclickTd(td);
            }
        }
        ss.remove();
        Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
    });
};

Mqe.Db.setupFilteringInputFilling = function(modalEl) {
    $('.series-spec-wrap', modalEl).on('change', '.filtering-select', function() {
        Mqe.log('fi');
        var ss = $(this).closest('.series-spec');
        var newColumnNo = JSON.parse($('option:selected', this).val()).idx;
        if (ss.data('sampledFrom')) {
            var val;
            if (newColumnNo === -1) {
                val = ''+ss.data('sampledFrom').rowno;
            } else {
                var td = Mqe.Db.findTd(ss.data('sampledFrom').rowno, newColumnNo, modalEl);
                if (!_.isEmpty(td)) {
                    val = _.trim(td.html());
                }
            }

            if (!_.isUndefined(val)) {
                ss.find('.filtering-expr-input').val(val);
                ss.find('.series-spec-name-input').val(val);
            }
        }

        Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
    });
};

Mqe.Db.setupSeriesSpecAdding = function(modalEl) {
    $('.series-spec-add', modalEl).on('click', function() {
        Mqe.ajaxJSON('/a/render_empty_series_spec', {
            report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id')),
            report_instance_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id'))
        }, function(resp) {
            $('.series-spec-wrap', modalEl).append(resp['result']['series_spec_html']);
            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
        });
    });
};

Mqe.Db.setupShowSpecification = function(modalEl) {
    $('.show-specification', modalEl).on('click', function() {
        $('.series-spec-all').slideToggle(300);
    });
};

Mqe.Db.getConfiguredSeriesSpecList = function(modalEl) {
    return _.map($('.series-spec', modalEl), Mqe.Db.seriesSpecFromDiv);
};

Mqe.Db.getConfiguredSeriesSpecCreatorSpec = function(modalEl) {
    var cb = $('.sscs-cb', modalEl);
    if (!_.isEmpty(cb) && cb.is(':checked')) {
        return cb.data('sscs');
    }
    return null;
};

Mqe.Db.sscsHighColumn = function(modalEl) {
    var sscsActual = $('.sscs-cb', modalEl).data('sscs-actual');
    $('.parsing-result-table-wrap td[data-colno='+sscsActual.actual_data_colno+']', modalEl).addClass('sscs-high');
};

Mqe.Db.sscsLowColumn = function(modalEl) {
    $('.parsing-result-table-wrap td.sscs-high', modalEl).removeClass('sscs-high');
};

Mqe.Db.setupSscs = function(modalEl) {
    $('.sscs-cb', modalEl).change(function() {
        if ($(this).is(':checked')) {
            Mqe.Db.sscsHighColumn(modalEl);
        } else {
            Mqe.Db.sscsLowColumn(modalEl);
        }
    });
    Mqe.Db.sscsHighColumn(modalEl);
};

Mqe.Db.hideSscs = function(modalEl) {
    $('.series-spec-creator-spec', modalEl).html('');
    Mqe.Db.sscsLowColumn(modalEl);
};

Mqe.Db.handleSeriesSpecCreatorSpec = function(modalEl) {
    var show = function(templateSS) {
        Mqe.ajaxJSON('/a/render_series_spec_creator_spec', {
            report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id')),
            report_instance_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id')),
            template_ss: templateSS
        }, function(resp) {
            $('.series-spec-creator-spec', modalEl).html(resp['result']['html']);
            Mqe.Db.setupSscs();
        });
    };

    var numDataRows = $('.parsing-result-table-wrap tbody tr', modalEl).length;
    var numHeaderRows = $('.parsing-result-table-wrap thead tr', modalEl).length;
    var seriesSpecList = Mqe.Db.getConfiguredSeriesSpecList(modalEl);
    if (seriesSpecList.length < 2) {
        return Mqe.Db.hideSscs();
    }
    if (seriesSpecList.length < numDataRows) {
        return Mqe.Db.hideSscs();
    }
    if (!Mqe.sameValues(_.map(seriesSpecList, 'data_colno')) ||
        !Mqe.sameValues(_.map(seriesSpecList, 'filtering_colno'))) {
        return Mqe.Db.hideSscs();
    }
    if (!_.every(seriesSpecList, function(ss) {
            return ss.filtering_expr.op === 'eq';
        })) {
        return Mqe.Db.hideSscs();
    }
    show(seriesSpecList[0]);
};

Mqe.Db.renderRecentReports = function(modalEl) {
    $('.refresh-recent-reports i', modalEl).addClass('icon-loading');
    Mqe.ajaxJSON('/a/render_recent_reports', {}, function(resp) {
        $('.refresh-recent-reports i', modalEl).removeClass('icon-loading');
        if (resp['success']) {
            $('.add-report-recent', modalEl).html(resp['result']['html']);
        }
    });
};

Mqe.Db.setupSeriesSpecChanging = function(modalEl) {
    var onSeriesSpecChange = function() {
        Mqe.log('ch');
        var ss = $(this).closest('.series-spec');
        if (ss.data('sampledFrom')) {
            Mqe.Db.unclickTd(Mqe.Db.findTd(ss.data('sampledFrom').rowno, ss.data('sampledFrom').colno, modalEl));
        }

        var params = {};
        params.report_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id'));
        params.report_instance_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id'));
        params.series_spec = Mqe.Db.seriesSpecFromDiv(ss);
        Mqe.ajaxJSON('/a/matching_cell_for_series_spec', params, function(resp) {
            var rowno = _.get(resp, 'result.rowno');
            var colno = _.get(resp, 'result.colno');
            if (!_.isUndefined(rowno)) {
                var clickedTd = Mqe.Db.findTd(rowno, colno, modalEl);
                $(clickedTd).addClass('td-clicked');
                if (params.series_spec.filtering_colno !== null) {
                    var toHighlight = Mqe.Db.findTd(rowno, params.series_spec.filtering_colno, modalEl);
                    toHighlight.addClass('td-highlighted');
                    Mqe.pushData(toHighlight, 'becauseOfColnos', colno);
                }
                ss.data('sampledFrom', {rowno: rowno, colno: colno});
            }
            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
        });
    };

    $('.series-spec-wrap', modalEl).on('change', '.series-spec select', onSeriesSpecChange);
    $('.series-spec-wrap', modalEl).on('change', '.series-spec input', onSeriesSpecChange);
};

Mqe.Db.setupAddreport = function() {
    var modalEl = $('#modal-add-report');
    var cleanupModal = function() {
        $('input[name=tw-type][value=Range]', modalEl).click();
        $('input[name=tw-type-range-numback]', modalEl).val('7.0');
        $('.back-unit', modalEl).val('days');

        $('#modal-add-report input[type="text"]').val('');
        $('#modal-add-report .modal-message-message').html('');
        $('#modal-add-report .modal-message').slideUp();

        $('.parsing-result-table-wrap', modalEl).html('');
        $('.parsing-result-table-wrap', modalEl).attr('report-id', '');
        $('.parsing-result-table-wrap', modalEl).attr('report-instance-id', '');

        $('.spec-def', modalEl).hide();
        $('.tile-options', modalEl).hide();
        $('.series-spec-all', modalEl).hide();
        $('.series-spec-wrap', modalEl).html('');

        $('.add-tag-sample', modalEl).html('');
        $('.selected-tag-list', modalEl).html('');
        $('.tags-row', modalEl).hide();
    };

    $('#db-action-addreport').click(function() {
        Mqe.showModal(modalEl, cleanupModal);
        Mqe.maybeFocus($('#add-report-name'));
        Mqe.Db.renderRecentReports(modalEl);
    });

    $('#add-report-name').autocomplete({
        source: function(request, response) {
            Mqe.ajaxJSON('/a/autocomplete_report_name', {term: request.term}, function(resp) {
                if (resp['success']) {
                    response(resp['result']['data']);
                }
            });
        }
    });

    var onReportNameEntered = function(ev, ui) {
        var enteredValue = _.get(ui, 'item.value') || $(this).val();
        Mqe.ajaxJSON('/a/add_report_name_entered', {report_name: enteredValue}, function(resp) {
            $('.selected-tag-list', modalEl).html('');
            $('.series-spec-wrap', modalEl).html('');
            Mqe.Db.hideSscs();
            if (resp['success']) {
                if (resp['result']['has_tags']) {
                    $('.tags-row', modalEl).show();
                    $('.add-tag-sample', modalEl).html(resp['result']['tag_sample']);
                } else {
                    $('.tags-row', modalEl).hide();
                    $('.add-tag-sample', modalEl).html('');
                }

                $('.add-report-range-newest', modalEl).html(resp['result']['html_newest_table']);
                $('.parsing-result-table-wrap', modalEl).attr('data-report-id', JSON.stringify(resp['result']['report_id']));
                $('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id', JSON.stringify(resp['result']['latest_instance_id']));
                $('.spec-def', modalEl).show();
                $('.tile-options', modalEl).show();

                if (resp['result']['latest_instance_tags']) {
                    _.forEach(resp['result']['latest_instance_tags'], function(tagName) {
                        addTag(tagName);
                    });
                }
            } else {
                $('.tags-row', modalEl).hide();
                $('.add-tag-sample', modalEl).html('');

                $('.add-report-range-newest', modalEl).html('');
                $('.parsing-result-table-wrap', modalEl).attr('data-report-id', 'null');
                $('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id', 'null');
                $('.spec-def', modalEl).hide();
                $('.tile-options', modalEl).hide();
            }
        });
    };

    $('#add-report-name').on('autocompleteselect', onReportNameEntered);
    $('#add-report-name').on('keypress', function(ev) {
        if (ev.which === 13) {
            onReportNameEntered.bind(this)();
        }
    });

    $('.add-report-recent', modalEl).on('click', '.recent-report-name', function() {
        $('#add-report-name').val($(this).attr('data-name'));
        onReportNameEntered.bind($('#add-report-name')[0])();
    });

    $('.add-report-recent', modalEl).on('click', '.refresh-recent-reports', function() {
        Mqe.Db.renderRecentReports(modalEl);
    });


    /// tags start

    var addTag = function(tagName) {
        $('.tag-list-el', modalEl).show();
        var el = Mqe.getPrepared($('.selected-tag'));
        $('.selected-tag-name', el).text(tagName);
        $(el).data('name', tagName);
        $('.selected-tag-list', modalEl).append(el);
    };

    var onTagEntered = function(ev, ui) {
        var enteredValue = _.get(ui, 'item.value') || $(this).val();
        if (_.isEmpty(enteredValue)) {
            return;
        }
        if (_.find(Mqe.getSelectedTags(modalEl), function(t) { return t === enteredValue; })) {
            return;
        }
        addTag(enteredValue);
        onSelectedTagsChange();
    };

    var onSelectedTagsChange = function() {
        $('.series-spec-wrap', modalEl).html('');
        Mqe.Db.hideSscs(modalEl);

        Mqe.ajaxJSON('/a/selected_tags_change', {
            report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id')),
            tags: Mqe.getSelectedTags(modalEl)
        }, function(resp) {
            if (resp['success']) {
                $('.add-report-range-newest', modalEl).html(resp['result']['html_newest_table']);
                $('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id', JSON.stringify(resp['result']['latest_instance_id']));
            } else {
                $('.add-report-range-newest', modalEl).html('');
                $('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id', 'null');
            }
        });
    };

    $('.selected-tag-list', modalEl).on('click', '.selected-tag i', function() {
        var el = $(this).closest('.selected-tag');
        $(el).remove();
        onSelectedTagsChange();
    });

    $('#add-tag').autocomplete({
        source: function(request, response) {
            Mqe.ajaxJSON('/a/autocomplete_tag_name', {
                    term: request.term,
                    report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id'))
                },
                function(resp) {
                    if (resp['success']) {
                        response(resp['result']['data']);
                    }
                });
        }
    });

    $('#add-tag').on('autocompleteselect autocompletechange change', onTagEntered);
    $('#add-tag').on('keypress', function(ev) {
        if (ev.which === 13) {
            onTagEntered.bind(this)();
        }
    });

    $('.add-tag-sample', modalEl).on('click', '.sample-tag-name', function() {
        $('#add-tag').val($(this).attr('data-name'));
        $('#add-tag').change();
    });

    /// tags end

    $('.parsing-result-table-wrap', modalEl).on('click', 'td', function() {
        var td = $(this);
        var rowno = JSON.parse(td.attr('data-rowno'));
        var colno = JSON.parse(td.attr('data-colno'));

        if (td.hasClass('td-clicked')) {
            Mqe.Db.unclickTd(td);
            _.forEach($('.series-spec:data(sampledFrom)', modalEl), function(ss) {
                ss = $(ss);
                if (ss.data('sampledFrom').rowno === rowno && ss.data('sampledFrom').colno === colno) {
                    ss.remove();
                }
            });
            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
            return;
        }

        var params = {};
        params.report_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id'));
        params.report_instance_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id'));
        params.sample = {rowno: rowno, colno: colno};
        $(this).addClass('waiting-for-series-spec');
        var that = this;
        Mqe.ajaxJSON('/a/compute_series_spec', params, function(resp) {
            $(that).removeClass('waiting-for-series-spec');
            $(that).addClass('td-clicked');

            var seriesSpec = resp['result']['series_spec'];
            if (seriesSpec.filtering_colno !== null) {
                var toHighlight = Mqe.Db.findTd(rowno, seriesSpec.filtering_colno, modalEl);
                toHighlight.addClass('td-highlighted');
                Mqe.pushData(toHighlight, 'becauseOfColnos', colno);
            }
            var seriesSpecHtml = $(resp['result']['series_spec_html']);
            seriesSpecHtml.data('sampledFrom', params.sample);
            $('.series-spec-wrap', modalEl).append(seriesSpecHtml);

            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
        });
    });

    Mqe.Db.setupFilteringInputFilling(modalEl);
    Mqe.Db.setupSeriesSpecChanging(modalEl);
    Mqe.Db.setupSeriesSpecDeleting(modalEl);
    Mqe.Db.setupSeriesSpecAdding(modalEl);
    Mqe.Db.setupShowSpecification(modalEl);

    $('input[name=tw-type]', modalEl).change(function() {
        if ($(this).val() === 'Range') {
            $('input[name=tw-type-range-numback]', modalEl).attr('disabled', false);
            $('.back-unit', modalEl).attr('disabled', false);
        }  else {
            $('input[name=tw-type-range-numback]', modalEl).attr('disabled', true);
            $('.back-unit', modalEl).attr('disabled', true);
        }
    });

    $('#add-report-button').click(function() {
        var seriesSpecList = Mqe.Db.getConfiguredSeriesSpecList(modalEl);
        if (!seriesSpecList.length) {
            Mqe.showModalMessage(modalEl, 'No values to graph selected.');
            return;
        }
        Mqe.hideModalMessageIfVisible(modalEl);
        var twType = $('input[name=tw-type]:checked', modalEl).val();
        var sscs = Mqe.Db.getConfiguredSeriesSpecCreatorSpec(modalEl);
        var tile_config = {
            tags: Mqe.getSelectedTags(modalEl),
            tw_type: twType,
            series_spec_list: seriesSpecList,
            tile_options: {sscs: sscs}
        };
        if (twType === 'Range') {
            tile_config.tile_options.chart_type = 'line';
            _.assign(tile_config.tile_options, Mqe.Db.getBackParams(modalEl));
        } else if (twType === 'Single') {
            tile_config.tile_options.chart_type = 'bar';
        }

        // close before ajax to prevent hanging modal
        Mqe.closeModal();

        var dashboardId = $('.grid-stack[data-dashboard-id]').data('dashboardId');
        Mqe.ajaxJSON('/a/create_tile', {
            dashboard_id: dashboardId,
            report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id')),
            report_instance_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id')),
            tile_config: tile_config,
            moveresize: Mqe.Db.isActionActive($('#db-action-moveresize')),
            for_layout_id: Mqe.Db.getLayoutId()
        }, function(resp) {
            Mqe.Db.handleDbmessagesOnCreateTile();
            if (resp['success']) {
                Mqe.Db.setLayoutId(dashboardId, resp['result']['new_layout_id']);
                var el = $(resp['result']['tile_html']);
                var grid = Mqe.Db.grid();
                grid.add_widget(el);
                Mqe.scrollTo(el);
                Mqe.Db.setupTileSettingsOpening();
                Mqe.Db.drawSingleTile(el);
            } else {
                Mqe.Messagebox.show('Error', resp['details']['message']);
            }
        });
    });
};



// PART modal tile settings


Mqe.Db.cleanupModalTileSettings = function() {
    var modalEl = $('#modal-tile-settings');
    var gsEl = Mqe.Db.findGridstackItem(modalEl.data('tileId'));

    $('.tw-bar', gsEl).css({color: '#1F5C63'});
    $('.grid-stack-item-content', gsEl).css({borderColor: '#E6E2EC'});

    $('#ts-report-name', modalEl).html('...');

    $('.parsing-result-table-wrap', modalEl).html('');
    $('.parsing-result-table-wrap', modalEl).attr('report-id', '');
    $('.parsing-result-table-wrap', modalEl).attr('report-instance-id', '');

    $('.selected-tag-list', modalEl).html('');
    $('.tag-list-row', modalEl).hide();

    $('.spec-def', modalEl).hide();
    $('.series-spec-all', modalEl).hide();
    $('.series-spec-wrap', modalEl).html('');

    $('.tw-specific', modalEl).hide();

    $('input[type="text"]', modalEl).val('');
    $('.modal-message-message', modalEl).html('');
    $('.modal-message', modalEl).slideUp();

    $('.graph-color-wrap', modalEl).remove();
    $('.delete-color-wrap', modalEl).hide();

    $('.series-spec-creator-spec', modalEl).html('');

    $('.tpcreator-content', modalEl).hide();
    $('.tpcreator-content', modalEl).html('');
    $('#tpcreator-cb', modalEl).prop('checked', false);
    $('.tpcreator-info', modalEl).hide();
    $('.tpcreator-row', modalEl).hide();
};

Mqe.Db.setupTileSettingsOpening = function() {
    var modalEl = $('#modal-tile-settings');
    $('.tw-icon-settings').off('click');
    $('.tw-icon-settings').click(function() {
        var tileId = Mqe.Db.tileIdOfGridstackItem($(this).closest('.grid-stack-item'));
        modalEl.data('tileId', tileId);

        var gsEl = Mqe.Db.findGridstackItem(tileId);
        var twEl = $('.tw', gsEl);

        $('.spec-def', modalEl).show();

        $('.tw-bar', gsEl).css({color: '#AD2D19'});
        $('.grid-stack-item-content', gsEl).css({borderColor: '#AD2D19'});

        Mqe.showModal(modalEl, Mqe.Db.cleanupModalTileSettings);

        Mqe.ajaxJSON('/a/fetch_tile_settings', {
            dashboard_id: $('.grid-stack[data-dashboard-id]').data('dashboardId'),
            tile_id: tileId
        }, function(resp) {
            if (!resp['success']) {
                Mqe.closeModal();
                Mqe.Messagebox.show('Error', resp['details']['message']);
                return;
            }
            twEl.data('tileOptions', resp['result']['tile_options']);
            $('.tw-specific[data-tw-type='+resp['result']['tile_options']['tw_type']+']', modalEl).show();

            $('.parsing-result-table-wrap', modalEl).attr('data-report-id', JSON.stringify(resp['result']['report_id']));
            $('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id', JSON.stringify(resp['result']['latest_instance_id']));
            $('#ts-report-name').text(resp['result']['report_name']);

            if (resp['result']['html_selected_tags']) {
                $('.selected-tag-list', modalEl).html(resp['result']['html_selected_tags']);
                $('.tag-list-row', modalEl).show();
            }

            $('.parsing-result-table-wrap', modalEl).html(resp['result']['html_newest_table']);
            $('.series-spec-wrap', modalEl).html(resp['result']['html_all_series_specs']);
            _.forEach($('.series-spec', modalEl), function(ss) {
                ss = $(ss);
                if (ss.data('sampledFrom')) {
                    var rowno = ss.data('sampledFrom').rowno;
                    var colno = ss.data('sampledFrom').colno;
                    var td = Mqe.Db.findTd(rowno, colno, modalEl);
                    $(td).addClass('td-clicked');
                    var seriesSpec = Mqe.Db.seriesSpecFromDiv(ss);
                    if (seriesSpec.filtering_colno !== null) {
                        var toHighlight = Mqe.Db.findTd(rowno, seriesSpec.filtering_colno, modalEl);
                        toHighlight.addClass('td-highlighted');
                        Mqe.pushData(toHighlight, 'becauseOfColnos', colno);
                    }
                }
            });

            if (!_.isEmpty(resp['result']['html_sscs'])) {
                $('.series-spec-creator-spec', modalEl).html(resp['result']['html_sscs']);
                Mqe.Db.setupSscs();
            }

            var tw = Mqe.Tw.createTilewidget(twEl);

            if (resp['result']['html_tpcreator_content']) {
                if (!_.get(tw.getTileOptions(), 'tpcreator_data.master_tile_id')) {
                    $('#tpcreator-cb', modalEl).change(function() {
                        if($(this).is(':checked')) {
                            $('.tpcreator-content', modalEl).show();
                        } else {
                            $('.tpcreator-content', modalEl).hide();
                        }
                    });
                    $('.tpcreator-content', modalEl).html(resp['result']['html_tpcreator_content']);
                    $('.tpcreator-row', modalEl).show();
                    if (resp['result']['tile_options']['tpcreator_uispec']) {
                        $('#tpcreator-cb', modalEl).click();
                    }
                } else {
                    $('.tpcreator-row', modalEl).hide();
                    $('.tpcreator-info', modalEl).show();
                }
            }

            tw.fillTileSettings(modalEl);
        });
    });
};

Mqe.Db.addTileSettingsColor = function(modalEl, c) {
    $('.delete-color-wrap', modalEl).before('<div class=graph-color-wrap> <input type=color value="'+c+'"> </div>');
    if (_.isEmpty($('.delete-color-wrap:visible', modalEl))) {
        $('.delete-color-wrap', modalEl).show();
    }
};
Mqe.Db.deleteTileSettingsColor = function(modalEl) {
    $('.graph-color-wrap', modalEl).last().remove();
    if (_.isEmpty($('.delete-color-wrap:visible', modalEl))) {
        $('.delete-color-wrap', modalEl).show();
    }
};
Mqe.Db.setupTileSettings = function() {
    var modalEl = $('#modal-tile-settings');

    Mqe.Db.setupTileSettingsOpening();

    $('.parsing-result-table-wrap', modalEl).on('click', 'td', function() {
        var td = $(this);
        var rowno = JSON.parse(td.attr('data-rowno'));
        var colno = JSON.parse(td.attr('data-colno'));

        if (td.hasClass('td-clicked')) {
            Mqe.Db.unclickTd(td);
            _.forEach($('.series-spec:data(sampledFrom)', modalEl), function(ss) {
                ss = $(ss);
                if (ss.data('sampledFrom').rowno === rowno && ss.data('sampledFrom').colno === colno) {
                    ss.remove();
                }
            });
            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
            return;
        }

        var params = {};
        params.series_type = 'range';
        params.report_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id'));
        params.report_instance_id = JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-instance-id'));
        params.sample = {rowno: rowno, colno: colno};
        $(this).addClass('waiting-for-series-spec');
        var that = this;
        Mqe.ajaxJSON('/a/compute_series_spec', params, function(resp) {
            $(that).removeClass('waiting-for-series-spec');
            $(that).addClass('td-clicked');
            var seriesSpec = resp['result']['series_spec'];
            if (seriesSpec.filtering_colno !== null) {
                var toHighlight = Mqe.Db.findTd(rowno, seriesSpec.filtering_colno, modalEl);
                toHighlight.addClass('td-highlighted');
                Mqe.pushData(toHighlight, 'becauseOfColnos', colno);
            }
            var seriesSpecHtml = $(resp['result']['series_spec_html']);
            seriesSpecHtml.data('sampledFrom', params.sample);
            $('.series-spec-wrap', modalEl).append(seriesSpecHtml);

            Mqe.Db.handleSeriesSpecCreatorSpec(modalEl);
        });
    });

    Mqe.Db.setupFilteringInputFilling(modalEl);
    Mqe.Db.setupSeriesSpecChanging(modalEl);
    Mqe.Db.setupSeriesSpecDeleting(modalEl);
    Mqe.Db.setupSeriesSpecAdding(modalEl);
    Mqe.Db.setupShowSpecification(modalEl);

    $('.add-color', modalEl).click(function() {
        var DEFAULT_COLOR = '#7CB5EC';
        Mqe.Db.addTileSettingsColor(modalEl, DEFAULT_COLOR);
    });

    $('.delete-color', modalEl).click(function() {
        Mqe.Db.deleteTileSettingsColor(modalEl);
    });

    $('#tile-settings-apply-button').click(function() {
        var twEl = Mqe.Db.twElForModal(modalEl);
        var tw = Mqe.Tw.createTilewidget(twEl);
        if (_.isEmpty(tw)) {
            Mqe.showModalMessage(modalEl, 'The tile\'s state has been changed by someone else. Please re-open the settings window.');
            return;
        }
        var seriesSpecList = Mqe.Db.getConfiguredSeriesSpecList(modalEl);
        if (!seriesSpecList.length) {
            Mqe.showModalMessage(modalEl, 'No values to graph selected.');
            return;
        }

        var sscs = Mqe.Db.getConfiguredSeriesSpecCreatorSpec(modalEl);

        var tpcreator_uispec;
        if ($('#tpcreator-cb', modalEl).is(':checked')) {
            tpcreator_uispec = _.map($('.tpcreator-content option:selected', modalEl), function(el) {
                return JSON.parse($(el).val());
            });
        } else {
            tpcreator_uispec = null;
        }

        var tile_config = {
            tags: tw.getTileOptions()['tags'],
            series_spec_list: seriesSpecList,
            tile_options: {
                sscs: sscs,
                tpcreator_uispec: tpcreator_uispec
            }
        };
        tw.fillTileConfig(modalEl, tile_config);
        Mqe.hideModalMessageIfVisible(modalEl);
        var dashboardId = Mqe.Db.getDashboardId();
        var tileId = modalEl.data('tileId');
        Mqe.ajaxJSON('/a/replace_tile', {
            dashboard_id: dashboardId,
            tile_id: tileId,
            report_id: JSON.parse($('.parsing-result-table-wrap', modalEl).attr('data-report-id')),
            tile_config: tile_config,
            for_layout_id: Mqe.Db.getLayoutId()
        }, function(resp) {
            if (resp['success'] !== true) {
                Mqe.Messagebox.show('Error', 'Cannot save data. Please reload the page.');
                return;
            }
            modalEl.data('tileId', resp['result']['new_tile']['tile_id']);
            Mqe.closeModal();

            var gsEl = Mqe.Db.findGridstackItem(tileId);
            Mqe.Db.cleanupTileResources(gsEl);
            gsEl.attr('data-tile-id', JSON.stringify(resp['result']['new_tile']['tile_id']));
            twEl.data('tileOptions', resp['result']['new_tile']['tile_options']);
            Mqe.Db.drawSingleTile(Mqe.Db.findGridstackItem(
                resp['result']['new_tile']['tile_id']));

            Mqe.Db.setLayoutId(dashboardId, resp['result']['new_layout_id']);

            _.forEach(resp['result']['tpcreated_replacement'], function(repl) {
                var gsEl = Mqe.Db.findGridstackItem(repl[0]);
                Mqe.Db.cleanupTileResources(gsEl);
                gsEl.attr('data-tile-id', JSON.stringify(repl[1]));
                Mqe.Db.drawSingleTile(gsEl);
            });
        });
    });

    $('#ts-delete-button').click(function() {
        var tileId = modalEl.data('tileId');
        var dashboardId = $('.grid-stack[data-dashboard-id]').data('dashboardId');
        Mqe.ajaxJSON('/a/delete_tile', {
            dashboard_id: dashboardId,
            tile_id: tileId,
            for_layout_id: Mqe.Db.getLayoutId()
        }, function(resp) {
            Mqe.closeModal();
            if (resp['success']) {
                var gsEl = Mqe.Db.findGridstackItem(tileId);
                // it could be deleted from a different web browser
                if (!_.isEmpty(gsEl)) {
                    Mqe.Db.cleanupTileResources(gsEl);
                    Mqe.Db.setLayoutId(dashboardId, resp['result']['new_layout_id']);
                    var grid = Mqe.Db.grid();
                    grid.remove_widget(gsEl);
                }
            } else {
                Mqe.Messagebox.show('Error', resp['details']['message']);
            }
        });
    });

    $('#ts-move-button').click(function() {
        var tileId = $('#modal-tile-settings').data('tileId');
        Mqe.MoveTile.show($('#modal-move-tile'), tileId);
    });

};




// PART moving a tile


Mqe.MoveTile = {};
Mqe.MoveTile.setup = function() {
    var modalEl = $('#modal-move-tile');
    $('.mt-apply-button', modalEl).click(function() {
        var dashboardOption = $('.move-to-dashboard-select option:selected', modalEl);
        if (_.isEmpty(dashboardOption)) {
            Mqe.closeModal();
            return;
        }
        var dashboardId = $('.grid-stack[data-dashboard-id]').data('dashboardId');
        var targetDashboardId = JSON.parse(dashboardOption.val());
        Mqe.ajaxJSON('/a/move_tile', {
            dashboard_id: dashboardId,
            tile_id: modalEl.data('tileId'),
            target_dashboard_id: targetDashboardId,
            for_layout_id: Mqe.Db.getLayoutId()
        }, function(resp) {
            Mqe.closeModal();
            Mqe.closeModal();
            if (resp['success']) {
                Mqe.Db.setLayoutId(dashboardId, resp['result']['new_layout_id']);
                var grid = Mqe.Db.grid();
                var gsEl = Mqe.Db.findGridstackItem(modalEl.data('tileId'));
                grid.remove_widget(gsEl);
            } else {
                Mqe.Messagebox.show('Error', resp['details']['message']);
            }
        });
    });
};
Mqe.MoveTile.show = function(modalEl, tileId) {
    modalEl.data('tileId', tileId);
    Mqe.showModal(modalEl, function() { Mqe.MoveTile.cleanup(modalEl); });
    Mqe.ajaxJSON('/a/fetch_move_tile_data', {
        dashboard_id: $('.grid-stack[data-dashboard-id]').data('dashboardId'),
        tile_id: tileId
    }, function(resp) {
        $('.mt-report-name', modalEl).text(resp['result']['report_name']);
        if (!resp['result']['has_options']) {
            $('.mt-dashboard-select', modalEl).html('<em>No dashboard different than the current one</em>');
            $('.mt-apply-button', modalEl).html('Close');
        } else {
            $('.mt-dashboard-select', modalEl).html(resp['result']['html_dashboard_select']);
        }
    });
};
Mqe.MoveTile.cleanup = function(modalEl) {
    $('.mt-report-name', modalEl).html('');
    $('.mt-dashboard-select', modalEl).html('');
    $('.mt-apply-button', modalEl).html('Apply');
    modalEl.removeData('tileId');
};




// PART dashboard settings


Mqe.DashboardSettings = {};

Mqe.DashboardSettings.setMaxWithoutDataState = function(modalEl, isChecked, num_back, back_unit) {
    var backInputs = $('.ds-back-wrap input', modalEl).add('.ds-back-wrap select', modalEl);

    if (isChecked) {
        backInputs.removeProp('disabled');
    } else {
        backInputs.prop('disabled', true);
    }

    if (!_.isUndefined(num_back) && !_.isUndefined(back_unit)) {
        $('input[name=tw-type-range-numback]', modalEl).val(num_back);
        $('.back-unit', modalEl).val(back_unit);
    }
};

Mqe.DashboardSettings.getMaxWithoutDataState = function(modalEl) {
    if ($('#ds-max-without-data-cb', modalEl).is(':checked')) {
        return Mqe.Db.getBackParams(modalEl);
    }
    return null;
};

Mqe.DashboardSettings.setup = function() {
    var modalEl = $('#modal-dashboard-settings');

    $('#ds-max-without-data-cb', modalEl).change(function() {
        Mqe.DashboardSettings.setMaxWithoutDataState(modalEl, $(this).is(':checked'));
    });

    $('#ds-delete-button', modalEl).click(function() {
        Mqe.ajaxJSON('/a/delete_dashboard', {
            dashboard_id: modalEl.data('dashboardId')
        }, function(resp) {
            if (resp['success']) {
                Mqe.closeModal();
                Mqe.reloadPage('/dashboard');
            }
        });

    });

    $('#ds-button', modalEl).click(function() {
        var maxWithoutDataState = Mqe.DashboardSettings.getMaxWithoutDataState(modalEl);
        var enable_synchronizing_tpcreated = $('#ds-enable-synchronizing-tpcreated', modalEl).is(':checked');
        var enable_synchronizing_tpcreated_x_axes = $('#ds-enable-synchronizing-tpcreated-x-axes', modalEl).is(':checked');

        Mqe.ajaxJSON('/a/update_dashboard', {
            dashboard_id: modalEl.data('dashboardId'),
            new_dashboard_name: $('#ds-name', modalEl).val(),
            max_without_data: maxWithoutDataState,
            enable_synchronizing_tpcreated: enable_synchronizing_tpcreated,
            enable_synchronizing_tpcreated_x_axes: enable_synchronizing_tpcreated_x_axes
        }, function(resp) {
            var dbTab = Mqe.Db.findDbTab(modalEl.data('dashboardId'));

            if (resp['result']['new_dashboard_name']) {
                $(dbTab).attr('data-dashboard-name', resp['result']['new_dashboard_name']);
                $(dbTab).text(resp['result']['new_dashboard_name']);
            }

            $(dbTab).attr('data-dashboard-options', JSON.stringify(resp['result']['new_dashboard_options']));

            if (!_.isEmpty(maxWithoutDataState)) {
                window.setTimeout(Mqe.Db.checkTilesWithoutData, 1000);
            }

            if (resp['result']['reloading_dashboard_required']) {
                Mqe.Db.reloadDashboardContent();
            }

            Mqe.closeModal();
        });
    });
};

Mqe.DashboardSettings.show = function(modalEl) {
    var dashboardId = $('.db-tab-active').data('dashboardId');
    var dashboardName = $('.db-tab-active').data('dashboardName');

    var dashboardOptions = JSON.parse($('.db-tab-active').attr('data-dashboard-options'));
    modalEl.data('dashboardId', dashboardId);
    $('#ds-name', modalEl).val(dashboardName);
    if (dashboardOptions['max_without_data']) {
        $('#ds-max-without-data-cb', modalEl).prop('checked', true);
        Mqe.DashboardSettings.setMaxWithoutDataState(modalEl,
            true,
            dashboardOptions['max_without_data']['num_back'],
            dashboardOptions['max_without_data']['back_unit']);
    } else {
        $('#ds-max-without-data-cb', modalEl).prop('checked', false);
        Mqe.DashboardSettings.setMaxWithoutDataState(modalEl, false, 7, 'days');
    }

    if (dashboardOptions['enable_synchronizing_tpcreated'] !== false) {
        $('#ds-enable-synchronizing-tpcreated', modalEl).prop('checked', true);
    }
    if (dashboardOptions['enable_synchronizing_tpcreated_x_axes'] === true) {
        $('#ds-enable-synchronizing-tpcreated-x-axes', modalEl).prop('checked', true);
    }

    Mqe.showModal(modalEl, function() { Mqe.DashboardSettings.cleanup(modalEl); });
};

Mqe.DashboardSettings.cleanup = function(modalEl) {
    $('#ds-max-without-data-cb', modalEl).prop('checked', false);
    $('#ds-enable-synchronizing-tpcreated', modalEl).prop('checked', false);
    $('#ds-enable-synchronizing-tpcreated-x-axes', modalEl).prop('checked', false);

    modalEl.removeData('dashboardId');
    modalEl.removeData('dashboardName');
};



// PART dashboard loading


Mqe.Db.historyState = function(newTab, fun) {
    var dashboard_id = JSON.parse(newTab.attr('data-dashboard-id'));
    var name = newTab.attr('data-dashboard-name');
    fun.call(window.history, {dashboard_id: dashboard_id, name: name}, '',
        _.template('/dashboard/${uuidStr}/${name}')({
            uuidStr: dashboard_id.arg,
            name: name
        }));
};

Mqe.Db.loadDashboard = function(newTab, explicitDashboardId) {
    var newDashboardId;
    if (!_.isUndefined(explicitDashboardId)) {
        newDashboardId = explicitDashboardId;
    } else {
        newDashboardId = JSON.parse(newTab.attr('data-dashboard-id'));
    }

    Mqe.purgeUrlFromAjaxQueue('/a/fetch_tile_data');

    newTab.removeClass('db-tab-inactive').addClass('db-tab-loading');
    Mqe.ajaxJSON('/a/render_dashboard', {
        dashboard_id: newDashboardId
    }, function(resp) {
        Mqe.Db.cleanupTiles();
        $('.db-wrap').replaceWith(resp.result.html);
        Mqe.Db.setupGridstack();
        $('.db-tab-active').removeClass('db-tab-active').addClass('db-tab-inactive');
        $('.db-tab').removeClass('db-tab-loading');
        newTab.removeClass('db-tab-inactive').addClass('db-tab-active');
        Mqe.Db.makeActionInactive($('#db-action-moveresize'));
        Mqe.Db.setupTileSettingsOpening();
        Mqe.Db.drawTiles();
    });
};

Mqe.Db.setupDashboardLoading = function() {
    $('.db-tabbar').on('click', '.db-tab a', function(e) {
        if (e.which === 1) {
            e.preventDefault();
        }
    });

    $('.db-tabbar').on('click', '.db-tab', function() {
        Mqe.Db.loadDashboard($(this));
        Mqe.Db.historyState($(this), window.history.pushState);
    });

    window.onpopstate = function(event) {
        if (event.state) {
            var newTab = $('.db-tab[data-dashboard-name="'+event.state.name+'"]');
            Mqe.Db.loadDashboard(newTab);
        }
    };
};



// PART dashboard actions


Mqe.Db.isActionActive = function(el) {
    return el.hasClass('db-action-active');
};
Mqe.Db.makeActionActive = function(el) {
    el.removeClass('db-action-inactive').addClass('db-action-active');
};
Mqe.Db.makeActionInactive = function(el) {
    el.removeClass('db-action-active').addClass('db-action-inactive');
};
Mqe.Db.toggleActionActive = function(el) {
    if (Mqe.Db.isActionActive(el)) {
        Mqe.Db.makeActionInactive(el);
        return false;
    } else {
        Mqe.Db.makeActionActive(el);
        return true;
    }
};
Mqe.Db.setupActions = function() {
    $('#db-action-settings').click(function() {
        var dsModal = $('#modal-dashboard-settings');
        Mqe.DashboardSettings.show(dsModal);
    });

    $('#db-action-moveresize').click(function() {
        var grid = Mqe.Db.grid();
        if (Mqe.Db.toggleActionActive($(this))) {
            grid.enable();
        } else {
            grid.disable();
        }
    });

    $('#db-action-fullscreen').click(function() {
        var toHide = '#header-wrap, .db-bar-wrap, #footerhr, #footer';
        var toShow = '#header-wrap, #footerhr, #footer';
        var el = $(this);
        if (Mqe.Db.toggleActionActive($(this))) {
            $(toHide).slideUp(500, function() {
                $('.db-bar-wrap').removeClass('db-bar-fixed');
                $('.db-wrap').removeClass('db-wrap-fixed');
                $('.db-wrap').css('margin-top', '');
                el.appendTo('#db-after-db');
            });
        } else {
            Mqe.Db.setHeaderFixedClasses();
            var sel;
            if ($('.db-wrap').hasClass('db-wrap-fixed')) {
                sel = toHide;
            } else {
                $('.db-bar-wrap').show();
                sel = toShow;
            }
            $(sel).slideDown(500);
            el.hide();
            el.appendTo('.db-action-bar');
            el.fadeIn();
        }
    });

};



// PART scrolling


Mqe.Db.setupScrolling = function() {
    $(window).bind('scroll', Mqe.Db.onScroll);
};

Mqe.Db.onScroll = function() {
    // check for full screen mode
    if (!$('.db-bar-wrap').is(':visible')) {
        return;
    }
    Mqe.Db.setHeaderFixedClasses();
};

Mqe.Db.setHeaderFixedClasses = function() {
    var isMobile = window.innerWidth <= 768;

    var px;
    if (isMobile) {
        px = 82;
    } else {
        px = 30;
    }

    var bar = $('.db-bar-wrap');
    var fixedClass = 'db-bar-fixed';
    var isBarFixed = bar.hasClass(fixedClass);

    var scrollTop = $(window).scrollTop();

    if (scrollTop > px) {
        if (!isBarFixed) {
            var margin = bar.height();
            $('.db-wrap').css('margin-top', margin+'px');

            bar.addClass(fixedClass);
            $('.db-wrap').addClass('db-wrap-fixed');
        }
    } else {
        if (isBarFixed) {
            bar.removeClass(fixedClass);
            $('.db-wrap').removeClass('db-wrap-fixed');
            $('.db-wrap').css('margin-top', '');
        }
    }
};



// PART dbmessages


Mqe.Db.DBMESSAGE_ANIMATE_TIME = 400;
Mqe.Db.handleDbmessagesOnCreateTile = function() {
    $('.dbmessage').slideUp(Mqe.Db.DBMESSAGE_ANIMATE_TIME, function() {
        $(this).remove();
    });
};

Mqe.Db.setupDbmessages = function() {
};



// PART window resizing


Mqe.Db.TW_ELS_TO_RESIZE = [];

Mqe.Db.setupWindowResize = function() {
    $(window).on('resize', function(event) {
        event.stopPropagation();

        var reflowTw = function(twEl) {
            if ($(twEl).data('inStateRendering')) {
                return;
            }
            var tw = Mqe.Tw.createTilewidget($(twEl));
            if (tw) {
                Mqe.log('resize', tw);
                var drawer = tw.createDrawer();
                drawer.reflow();
            }
        };

        var twArr;
        if (!$(event.target).hasClass('ui-resizable')) {
            Mqe.log('Global window resize');
            twArr = $('.tw');
        } else {
            Mqe.log('TW_ELS_TO_RESIZE', Mqe.Db.TW_ELS_TO_RESIZE);
            twArr = Mqe.Db.TW_ELS_TO_RESIZE;
        }
        _.forEach(twArr, reflowTw);
    });
};



// PART checking tiles without data


Mqe.Db.checkTilesWithoutData_real = function() {
    Mqe.log('checkTilesWithoutData');
    var activeTab = $('.db-tab.db-tab-active');
    var dashboardOptions = JSON.parse(activeTab.attr('data-dashboard-options'));
    if (_.isEmpty(dashboardOptions['max_without_data'])) {
        return;
    }

    var currentMillis = Mqe.currentMillisUTC();
    var minValidNewest = currentMillis - (dashboardOptions['max_without_data']['seconds_back'] * 1000);
    var tileIdsWithoutData = [];
    _.forEach($('.tw'), function(twEl) {
        if ($(twEl).data('inStateRendering')) {
            return;
        }
        var tw = Mqe.Tw.createTilewidget($(twEl));
        if (!tw) {
            return;
        }
        var maxTimestamp = tw.newestDataTimestamp();
        if (!maxTimestamp || maxTimestamp < minValidNewest) {
            Mqe.log('Without data', maxTimestamp, minValidNewest);
            var tileId = Mqe.Db.tileIdOfGridstackItem($(twEl).closest('.grid-stack-item'));
            tileIdsWithoutData.push(tileId);
        } else {
            Mqe.log('OK with data', maxTimestamp, minValidNewest);
        }
    });

    if (_.isEmpty(tileIdsWithoutData)) {
        return;
    }
    Mqe.ajaxJSON('/a/request_expire_tiles_without_data', {
        dashboard_id: Mqe.Db.getDashboardId(),
        tile_id_list: tileIdsWithoutData
    }, function(resp) {
        if (resp['success'] && resp['result']['tiles_expired']) {
           Mqe.Db.reloadDashboardContent();
        }
    });
};
Mqe.Db.checkTilesWithoutData = _.debounce(Mqe.Db.checkTilesWithoutData_real, 7000);

Mqe.Db.setupTilesWithoutDataChecking = function() {
    // one time run
    _.forEach([2000, 5000, 10000], function(timeout) {
        window.setTimeout(Mqe.Db.checkTilesWithoutData, timeout);
    });
    // continuous run
    window.setInterval(Mqe.Db.checkTilesWithoutData, 30000);
};



// PART synchronizing tpcreated


Mqe.Db._doSynchronizeTpcreated = function(triggeringTwEl, immediate) {
    if (_.isUndefined(immediate)) {
        immediate = false;
    }

    var masterTileId = Mqe.Db.masterTileIdGroup(triggeringTwEl);
    if (_.isEmpty(masterTileId)) {
        return;
    }

    var tpcreatedTws = _.filter($('.tw'), function(twEl) {
        return _.isEqual(masterTileId, Mqe.Db.masterTileIdGroup($(twEl)));
    });
    if (_.isEmpty(tpcreatedTws) || tpcreatedTws.length === 1) {
        return;
    }

    if (Mqe.Db.getDashboardOptions()['enable_synchronizing_tpcreated_x_axes'] === true) {
        Mqe.Tw.synchronizeXAxesOfTpcreated(tpcreatedTws);
    }

    if (Mqe.Db.getDashboardOptions()['enable_synchronizing_tpcreated'] !== false) {
        Mqe.Tw.synchronizeYAxesOfTpcreated(tpcreatedTws);
    }

};
// Mqe.Db.synchronizeTpcreated = _.debounce(Mqe.Db._doSynchronizeTpcreated, 500);
// Mqe.Db.synchronizeTpcreated = function(triggeringTwEl) {
//     window.setTimeout(function() { Mqe.Db._doSynchronizeTpcreated(triggeringTwEl); }, 1000);
// };
Mqe.Db.synchronizeTpcreated = Mqe.Db._doSynchronizeTpcreated;


// PART global setup


Mqe.Db.setup = function() {
    Mqe.Db.setupGridstack();
    Mqe.Tw.initChartjs();
    Mqe.Db.drawTiles();
    Mqe.Db.setupDbTabsOrdering();
    Mqe.Db.setupAddDashboard();
    Mqe.Db.setupAddreport();
    Mqe.Db.setupTileSettings();
    Mqe.MoveTile.setup();
    Mqe.DashboardSettings.setup();
    Mqe.Db.setupDashboardLoading();
    Mqe.Db.setupActions();
    Mqe.Tw.setupTilewidgetRefreshing();
    Mqe.Db.setupGlobalKeyBindings();
    Mqe.Db.setupScrolling();
    Mqe.Db.setupDbmessages();

    Mqe.Db.setupWindowResize();
    
    Mqe.Db.setupTouchDevice();
    Mqe.Db.setupTilesWithoutDataChecking();

    if (Mqe.Db.isProfilePage()) {
        var activeTab = $('.db-tab.db-tab-active');
        Mqe.Db.historyState(activeTab, window.history.replaceState);
    }
};


