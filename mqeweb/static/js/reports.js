/*jshint -W069 */

Mqe.Rep = {};

Mqe.Rep.setupReportListFetching = function() {
    $('#rep-filter-input').on('keypress', function(ev) {
        if (ev.which === 13) {
            Mqe.Rep.fetchReportList();
        }
        return true;
    });

    $('#rep-filter-button').on('click', Mqe.Rep.fetchReportList);

    $('#rep-reports-wrap').on('click', '.rep-next', function(ev) {
        Mqe.Rep.fetchNextReportPage();
    });

    $('#rep-reports-wrap').on('click', '.rep-item-instances', function() {
        var reportName = $(this).closest('.rep-item').data('reportName');
        var modalEl = $('#modal-ri-viewer');
        Mqe.RIViewer.show(modalEl, reportName);
    });
};

Mqe.Rep.fetchReportList = function() {
    var params = {
        filter_s: _.trim($('#rep-filter-input').val()),
        last_report_id: null
    };
    Mqe.Rep.fetchReportsFromParams(params);
    Mqe.Rep.historyState(params, window.history.pushState);
};

Mqe.Rep.fetchReportsFromParams = function(params, after) {
    var actualParams = params ? _.clone(params) : {};
    if (actualParams.last_report_id) {
        actualParams.last_report_id = Mqe.toUUID(actualParams.last_report_id);
    }
    $('#rep-reports-wrap').fadeTo(200, 0.5, function() {
        Mqe.ajaxJSON('/a/fetch_report_list', actualParams,
                function(resp) {
                    $('#rep-reports-wrap').html(resp['result']['html']);
                    $('#rep-reports-wrap').fadeTo(200, 1);
                    Mqe.callIfDefined(after);
                });
    });
};

Mqe.Rep.fetchNextReportPage = function() {
    var params = {
        filter_s: $('#rep-reports').data('filterS'),
        last_report_id: $('#rep-reports').data('lastReportId').arg
    };
    Mqe.Rep.fetchReportsFromParams(params, function() {
        Mqe.Rep.historyState(params, window.history.pushState);
    });
};

Mqe.Rep.historyState = function(params, fun, changeUrl) {
    if (typeof(changeUrl) === 'undefined') {
        changeUrl = true;
    }

    var url;
    if (!changeUrl) {
        url = Mqe.locationPath();
    } else if (_.some(_.values(params))) {
        url = '/reports?'+$.param(params);
    } else {
        url = '/reports';
    }
    fun.call(window.history, {params: params}, '', url);
};

Mqe.Rep.paramsFromUrl = function() {
    var params = {
        filter_s: Mqe.getQueryParam('filter_s'),
        last_report_id: Mqe.getQueryParam('last_report_id')
    };
    if (params.last_report_id) {
        params.last_report_id = Mqe.toUUID(params.last_report_id);
    }
    return params;
};

Mqe.Rep.setupHistory = function() {
    Mqe.Rep.historyState(Mqe.Rep.paramsFromUrl(), window.history.replaceState, false);

    window.onpopstate = function(event) {
        if (event.state) {
            Mqe.log('event.state', event.state);
            Mqe.Rep.fetchReportsFromParams(event.state.params);
            Mqe.Rep.fillInputs(event.state.params);
        }
    };
};

Mqe.Rep.fillInputs = function(params) {
    $('#rep-filter-input').val(params.filter_s || '');
};

Mqe.Rep.setup = function() {
    Mqe.Rep.setupReportListFetching();
    Mqe.Rep.setupHistory();

    Mqe.RIViewer.setup($('#modal-ri-viewer'));
    Mqe.Messagebox.setup();

    Mqe.Rep.fillInputs(Mqe.Rep.paramsFromUrl());

    Mqe.Messagebox.showFromSession();
};

