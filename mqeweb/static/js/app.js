Mqe.MODAL_OVERLAY = 0.5;

Mqe.LOG_TO_CONSOLE = false;




// PART utils


Mqe.keyPush = function(o, k, v) {
    if (!(k in o)) {
        o[k] = [];
    }
    o[k].push(v);
};

Mqe.toUUID = function(val) {
    if (typeof(val) === 'object' && '__type__' in val && val.__type__ === 'UUID') {
        return val;
    }
    return {__type__: 'UUID', arg: val};
};

Mqe.toDate = function(val) {
    if (typeof(val) === 'object' && '__type__' in val && val.__type__ === 'date') {
        return val;
    }
    return {__type__: 'date', arg: val.getTime()};
};

Mqe.enrichJSONObject = function(val) {
    if (_.isObject(val) && '__type__' in val && val.__type__ === 'date') {
        return val['arg'];
    }
    return null;
};

Mqe.postprocessJSON = function(o) {
    if (_.isArray(o)) {
        return _.map(o, Mqe.postprocessJSON);
    }
    if (_.isObject(o)) {
        var enriched = Mqe.enrichJSONObject(o);
        if (enriched !== null) {
            return enriched;
        }
        return _.mapValues(o, Mqe.postprocessJSON);
    }
    return o;
};

Mqe.enrichJSONObjectRich = function(val) {
    if (_.isObject(val) && '__type__' in val && val.__type__ === 'date') {
        return new Date(val['arg']);
    }
    return null;
};

Mqe.postprocessJSONRich = function(o) {
    if (_.isArray(o)) {
        return _.map(o, Mqe.postprocessJSONRich);
    }
    if (_.isObject(o)) {
        var enriched = Mqe.enrichJSONObject(o);
        if (enriched !== null) {
            return enriched;
        }
        return _.mapValues(o, Mqe.postprocessJSONRich);
    }
    return o;
};

Mqe.callIfDefined = function(f) {
    if (typeof(f) !== 'undefined') {
        f();
    }
};

Mqe.compareArrays = function(arr1, arr2) {
    var minLength = Math.min(arr1.length, arr2.length);
    for (var i = 0; i < minLength; ++i) {
        if (arr1[i] < arr2[i]) {
            return -1;
        }
        if (arr1[i] > arr2[i]) {
            return 1;
        }
    }
    return 0;
};

Mqe.sameValues = function(arr) {
    return _.uniq(arr).length === 1;
};

Mqe.getQueryParam = function(name, qstring) {
    if (!qstring) {
        qstring = window.location.search;
    }
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&!]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(qstring);
    if (results == null) {
        return null;
    }
    return decodeURIComponent(results[1].replace(/\+/g, " "));
};

Mqe.escapeHtml = function(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

Mqe.escapeRegExp = function(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

Mqe.replaceAll = function(string, find, replace) {
    return string.replace(new RegExp(Mqe.escapeRegExp(find), 'g'), replace);
};

Mqe.pushData = function(el, key, val) {
    if (_.isEmpty(el)) {
        return;
    }
    el = $(el);
    if (!el.data(key)) {
        el.data(key, []);
    }
    el.data(key).push(val);
};

Mqe.currentMillisUTC = function() {
    return (new Date().getTime()) - Mqe.clientServerMillisDiff;
};

Mqe.reloadPage = function(newUrl) {
    window.location.href = newUrl;
};

Mqe.log = function() {
    if (!Mqe.LOG_TO_CONSOLE) {
        return;
    }
    if (!_.isUndefined(console) && !_.isUndefined(console.log)) {
        console.log.apply(console, arguments);
    }
};

Mqe.cssDef = function(selector, propLines) {
    var res = [];
    res.push(selector + ' {\n');
    _.forEach(propLines, function(line) {
        if (!_.endsWith(_.trim(line), ';')) {
            line = line + ';';
        }
        res.push('    ' + line + '\n');
    });
    res.push('}\n');
    return res.join('');
};

Mqe.smallScreen = function() {
    return $(window).width() <= 768;
};

Mqe.touchScreen = function() {
    return 'ontouchstart' in document.documentElement;
};

Mqe.convertDateToUTC = function(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
};

Mqe.setTimezoneToUTC = function(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
};

Mqe.locationPath = function() {
    return window.location.pathname + window.location.search;
};

Mqe.getLocalizedMoment = function(arg) {
    var dt;
    if (!_.isDate(arg)) {
        dt = new Date(arg);
        dt = Mqe.convertDateToUTC(dt);
    } else {
        dt = arg;
    }
    var m = moment(dt);
    m.add(Mqe.userTimezoneOffset, 'h');
    return m;
};

Mqe.formatDate = function(dt) {
    var format;
    if (Mqe.dt_format === 'us') {
        format = 'M/D/YY h:mm:ss.SSS';
    } else {
        format = 'DD.MM.YYYY HH:mm:ss.SSS'
    }

    return Mqe.getLocalizedMoment(dt).format(format);
};




// PART common DOM functions


Mqe.getPrepared = function(jqA, removeDisplaynone) {
    if (typeof(removeDisplaynone) === 'undefined') {
        removeDisplaynone = true;
    }
    var res = jqA.filter('.prepared').clone();
    res.removeClass('prepared');
    if (removeDisplaynone) {
        res.removeClass('displaynone');
    }
    return res;
};

Mqe.maybeFocus = function(el) {
    if (!Mqe.smallScreen()) {
        $(el).focus();
    }
};

Mqe.offsetBottom = function(el) {
    return $(el).offset().top + $(el).height();
};

Mqe.autoselectText = function(el) {
    $(el).focus(function() {
        $(this).select();
        $(this).mouseup(function(e) {
            e.preventDefault();
        });
    });
};

Mqe.loadScriptOnce = function(id, src, after) {
    if ($('#'+id).length) {
        Mqe.callIfDefined(after);
        return;
    }
    var scriptEl = document.createElement('script');
    scriptEl.setAttribute('id', id);
    scriptEl.setAttribute('src', src);
    if (typeof(after) !== 'undefined') {
        scriptEl.onload = after;
    }
    document.head.appendChild(scriptEl);
};

Mqe.createStyle = function(style) {
    var el = document.createElement('style');
    el.type = 'text/css';
    if (el.styleSheet) {
        el.styleSheet.cssText = style;
    } else {
        el.appendChild(document.createTextNode(style));
    }
    document.head.appendChild(el);
};

Mqe.startLoadingAnimation = function(el) {
    el = $(el);
    var timeVar = window.setTimeout(function() {
        var doFadeOut = function() {
            el.fadeOut(1000, function() {
                el.fadeIn(1000);
            });
        };
        //doFadeOut();
        Mqe.log('x');
        Mqe.startLoadingAnimation(el);
    }, 2000);
    el.data('timeVar', timeVar);
};

Mqe.stopLoadingAnimation = function(el) {
    el = $(el);
    if (el.data('timeVar')) {
        window.clearTimeout(el.data('timeVar'));
    }
};

Mqe.scrollToPosition = function(pos, t, what, after) {
    if (typeof(t) === 'undefined') {
        t = 1000;
    }
    if (typeof(what) === 'undefined') {
        what = 'html, body';
    }

    $(what).animate({
        scrollTop: pos
    }, t, 'swing', function() {
        Mqe.callIfDefined(after);
    });
};

Mqe.scrollTo = function(el, t, what, after) {
    Mqe.scrollToPosition(el.offset().top - 50, t, what, after);
};

Mqe.getSelectedTags = function(contextEl) {
    return _.uniq(_.map($('.selected-tag', contextEl), function(el) {
        return $(el).data('name');
    }));
};

Mqe.isOverflowing = function(el) {
    var curOverflow = el.style.overflow;
    if (!curOverflow || curOverflow === "visible") {
        el.style.overflow = "hidden";
    }
    var isOverflowing = el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
    el.style.overflow = curOverflow;
    return isOverflowing;
};

Mqe.enlargeUntilOverflow = function(el) {
    var maxIterations = 100;
    var px = 12;
    var it = 0;
    var setPx = function(usedPx) {
        el.style.fontSize = usedPx+'px';
        Mqe.log('px '+usedPx);
        return;
    };
    while (px < 500) {
        //Mqe.log('enlarge it');
        var newPx = px*1.1;
        el.style.fontSize = newPx+'px';
        if (Mqe.isOverflowing(el)) {
            setPx(px);
            return;
        }
        px = newPx;
        ++it;
        if (it > maxIterations) {
            setPx(12);
            return;
        }
    }
};

Mqe.maybeFadeIn = function(els) {
    var px = $(window).scrollTop() + $(window).height();
    _.forEach(els, function(el) {
        if ($(el).hasClass('anim-fade-in')) {
            return;
        }
        var elPos = $(el).offset().top;
        if (elPos < px) {
            $(el).addClass('anim-fade-in');
        }
    });
};





// PART ajax calls


Mqe.AJAX_QUEUE_WAITING = {};
Mqe.AJAX_QUEUE_PENDING_NUM = {};
Mqe.AJAX_QUEUE_MAX_PENDING = {
    '/a/fetch_tile_data': 5
};
Mqe.processAjaxQueue = function(url) {
    var pending = Mqe.AJAX_QUEUE_PENDING_NUM[url] || 0;
    //Mqe.log('Pending for '+url+': '+pending);
    var maxPending = Mqe.AJAX_QUEUE_MAX_PENDING[url];
    if (!_.isUndefined(maxPending) && pending >= maxPending) {
        //Mqe.log('Max pending reached, not performing');
        return;
    }

    var waiting = Mqe.AJAX_QUEUE_WAITING[url];
    if (_.isEmpty(waiting)) {
        //Mqe.log('No waiting ajax calls for ' + url);
        return;
    }
    Mqe.log('Ajax waiting', waiting.length);
    var firstArgs = waiting.shift();
    //Mqe.log('Calling', firstArgs, 'rest:', waiting);
    Mqe.AJAX_QUEUE_PENDING_NUM[url] = (Mqe.AJAX_QUEUE_PENDING_NUM[url] || 0) + 1;
    Mqe._performAjaxJSON(firstArgs.url, firstArgs.data, firstArgs.doneFun, firstArgs.useDefaultFailHandler);
};
Mqe.continueProcessingAjaxQueue = function(url) {
    if (Mqe.AJAX_QUEUE_PENDING_NUM[url] > 0) {
        Mqe.AJAX_QUEUE_PENDING_NUM[url] = Mqe.AJAX_QUEUE_PENDING_NUM[url] - 1;
    }
    Mqe.processAjaxQueue(url);
};
Mqe.purgeUrlFromAjaxQueue = function(url) {
    Mqe.AJAX_QUEUE_WAITING[url] = [];
    Mqe.AJAX_QUEUE_PENDING_NUM[url] = 0;
};
Mqe.ajaxJSON = function(url, data, doneFun, useDefaultFailHandler) {
    if (typeof(data) === 'undefined') {
        data = {};
    }
    if (typeof(doneFun) === 'undefined') {
        doneFun = Mqe.checkResponse;
    }
    if (typeof(useDefaultFailHandler) === 'undefined') {
        useDefaultFailHandler = true;
    }

    data.context = Mqe.State.context;
    data.stoken = Mqe.State.stoken;
    var makeDoneFun = function(url, doneFun) {
        return function(resp, textStatus) {
            try {
                doneFun(resp, textStatus);
            } finally {
                Mqe.continueProcessingAjaxQueue(url);
            }
        };
    };
    Mqe.keyPush(Mqe.AJAX_QUEUE_WAITING, url, {url: url, data: data, doneFun: makeDoneFun(url, doneFun),
        useDefaultFailHandler: useDefaultFailHandler});
    Mqe.processAjaxQueue(url);
};
Mqe._ajaxJSONFailHandler = function(jqXHR) {
    if (jqXHR.status == 404) {
        console.error('404', jqXHR);
    } else {
        Mqe.Messagebox.show('Error', 'The system couldn\'t complete an internal request. Please try again in a minute.');
    }
};
Mqe._performAjaxJSON = function(url, data, doneFun, useDefaultFailHandler) {
    var promise = $.ajax({
        type: 'POST',
        url: url,
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json'
    });
    promise.done(doneFun);
    if (useDefaultFailHandler) {
        promise.fail(function(jqXHR) {
            try {
                Mqe._ajaxJSONFailHandler(jqXHR);
            } finally {
                Mqe.continueProcessingAjaxQueue(url);
            }
        });
    } else {
        promise.fail(doneFun);
    }
};

Mqe.checkResponse = function(resp) {
    if (resp['success'] !== true) {
        var msg;
        if (resp['details'] && resp['details']['message']) {
            msg = resp['details']['message'];
        } else {
            msg = 'Error when sending data to server - please check your network connection';
        }
        Mqe.Messagebox.show('Error', msg);
        return false;
    }
    return true;
};




// PART modals base implementation


Mqe.MODALS_STACK = [];
Mqe.FRONT_MODAL_Z_INDEX = 100010;
Mqe.COVERED_MODAL_Z_INDEX = 50000;
Mqe.modalOffset = function() {
    if (_.isEmpty(Mqe.MODALS_STACK)) {
        return $(window).height() * 0.1;
    }
    var lastOffset = _.last(Mqe.MODALS_STACK).offset;
    return lastOffset + $(window).height() * 0.05;
};
Mqe.showModal = function(modal, cleanupFun) {
    $('.modal-closeicon-icon').off('click').click(Mqe.closeModal);
    $('#lean_overlay').off('click').click(Mqe.closeModal);

    if (_.isEmpty(Mqe.MODALS_STACK)) {
        $('#lean_overlay').css({ 'display' : 'block', opacity : 0 });
        $('#lean_overlay').fadeTo(200, Mqe.MODAL_OVERLAY);
    } else {
        var lastModal = _.last(Mqe.MODALS_STACK).modal;
        lastModal.css({'opacity': 1, 'z-index': Mqe.COVERED_MODAL_Z_INDEX});
    }

    var offset = Mqe.modalOffset();
    modal.css({ 
        'top': window.pageYOffset + offset,
        'display': 'block',
        'opacity': 0
    });
    modal.fadeTo(200, 1);

    Mqe.MODALS_STACK.push({modal: modal, cleanupFun: cleanupFun, offset: offset});
};
Mqe.closeModal = function() {
    if (_.isEmpty(Mqe.MODALS_STACK)) {
        console.warn('Closing nonexisting modal');
        return;
    }
    var item = Mqe.MODALS_STACK.pop();
    item.modal.fadeOut(200, function() {
        item.modal.css({ 'display' : 'none' });
        Mqe.callIfDefined(item.cleanupFun);
    });
    if (_.isEmpty(Mqe.MODALS_STACK)) {
        $('#lean_overlay').fadeOut(200);
    } else {
        var lastModal = _.last(Mqe.MODALS_STACK).modal;
        lastModal.css({'z-index': Mqe.FRONT_MODAL_Z_INDEX});
    }
};

Mqe.showModalMessage = function(modalEl, message, iconClass) {
    if (_.isUndefined(iconClass)) {
        iconClass = 'fa-exclamation-circle';
    }

    $('.modal-message-icon', modalEl).addClass(iconClass);
    $('.modal-message-icon', modalEl).data('iconClass', iconClass);
    $('.modal-message-message', modalEl).html(message);
    $('.modal-message', modalEl).slideDown();
};
Mqe.hideModalMessage = function(modalEl, after) {
    $('.modal-message', modalEl).slideUp(200, function() {
        $('.modal-message-message', modalEl).html('');
        var iconClass = $('.modal-message-icon', modalEl).data('iconClass');
        $('.modal-message-icon', modalEl).removeClass(iconClass);
        $('.modal-message-icon', modalEl).removeData('iconClass');
        Mqe.callIfDefined(after);
    });
};
Mqe.isModalMessageVisible = function(modalEl) {
    return !_.isEmpty(_.trim($('.modal-message', modalEl).html()));
};
Mqe.hideModalMessageIfVisible = function(modalEl, after) {
    if (Mqe.isModalMessageVisible(modalEl)) {
        Mqe.hideModalMessage(modalEl, after);
    } else {
        Mqe.callIfDefined(after);
    }
};




// PART Report Instance Viewer


Mqe.RIViewer = {};

Mqe.RIViewer._isModalLoaded = function(modalEl) {
    if (!$(modalEl).data('reportName')) {
        return false;
    }
    return true;
};

Mqe.RIViewer.setup = function(modalEl) {
    $('.riv-action', modalEl).click(function() {
        if (!Mqe.RIViewer._isModalLoaded(modalEl)) {
            return;
        }
        if ($(this).hasClass('riv-action-disabled')) {
            return;
        }

        var direction;
        if ($(this).hasClass('riv-prev')) {
            direction = 'prev';
        } else if ($(this).hasClass('riv-next')) {
            direction = 'next';
        } else {
            direction = 'uknown';
        }

        Mqe.ajaxJSON('/a/report_instance_for_viewer', {
            report_name: $(modalEl).data('reportName'),
            tags: Mqe.getSelectedTags(modalEl),
            curr_report_instance_id: $(modalEl).data('currReportInstanceId'),
            direction: direction
        }, function(resp) {
            Mqe.RIViewer._fillFromResp(modalEl, resp);
        });

    });

    $('#riv-add-tag', modalEl).autocomplete({
        source: function(request, response) {
            if (!Mqe.RIViewer._isModalLoaded(modalEl)) {
                return;
            }
            Mqe.ajaxJSON('/a/autocomplete_tag_name', {
                term: request.term,
                report_id: modalEl.data('reportId')
            },
            function(resp) {
                if (resp['success']) {
                    response(resp['result']['data']);
                }
            });
        }
    });
    var insertTag = function(enteredValue) {
        if (_.find(Mqe.getSelectedTags(modalEl), function(t) { return t === enteredValue; })) {
            return;
        }

        $('.tag-list-el', modalEl).show();

        var el = Mqe.getPrepared($('.riv-prepared.selected-tag'));
        $('.selected-tag-name', el).html(enteredValue);
        $(el).data('name', enteredValue);
        $('.selected-tag-list', modalEl).append(el);
        onSelectedTagsChange();
    };
    var onTagEntered = function(ev, ui) {
        var enteredValue = _.get(ui, 'item.value') || $(this).val();
        if (_.isEmpty(enteredValue)) {
            return;
        }
        insertTag(enteredValue);
    };
    var onSelectedTagsChange = function() {
        Mqe.RIViewer._loadDefault(modalEl);
    };
    $('#riv-add-tag', modalEl).on('autocompleteselect autocompletechange change', onTagEntered);
    $('#riv-add-tag', modalEl).on('keypress', function(ev) {
        if (ev.which === 13) {
            onTagEntered.bind(this)();
        }
    });
    $('.selected-tag-list', modalEl).on('click', '.selected-tag i', function() {
        var el = $(this).closest('.selected-tag');
        $(el).remove();
        onSelectedTagsChange();
    });
    $('.riv-tags', modalEl).on('click', '.selected-tag-name', function() {
        insertTag($(this).html());
    });

    $('.riv-calendar i', modalEl).click(function() {
        if (!$(modalEl).data('reportName')) {
            // not yet loaded
            return;
        }
        var rdEl = $('.riv-calendar-content', modalEl).get(0);

        var getRomeOptions = function(after) {
            var options = {
                  autoHideOnClick: true
                , timeInterval: 3600
                , weekStart: 1
                , initialValue: $(modalEl).data('createdRaw')
            };
            Mqe.ajaxJSON('/a/report_instances_days', {
                report_name: $(modalEl).data('reportName'),
                // !!! days are for all tags due to rome's options caching
                tags: null
            }, function(resp) {
                if (resp['success']) {
                    options['dateValidator'] = rome.val.only(resp['result']['days']);
                }
                after(options);
            });
        };

        var tweakContent = function() {
            //$('.rd-back, .rd-next', rdEl).insertAfter('.rd-month-label', rdEl);
            $('.rd-back', rdEl).html('&#8592;').attr('title', 'Previous month');
            $('.rd-next', rdEl).html('&#8594;').attr('title', 'Next month');
            $('<i class="riv-calendar-close-icon clickable fa fa-times"></i>').insertAfter($('.rd-next', rdEl));
            $('.riv-calendar-close-icon', rdEl).click(function() {
                var rd = rome.find(rdEl);
                $(rdEl).hide();
                rd.destroy();
            });

            var timeSelected = $('.rd-time-selected', rdEl);
            $('<div class=riv-calendar-clock-icon> <i class="fa fa-lg fa-clock-o"></i> </div> <div class=riv-calendar-utc-label>UTC</div>').insertBefore(timeSelected);
            $('<div class=riv-search-button-wrap> <button class=riv-search-button type=button>Search</button> </div>').insertAfter($('.rd-time', rdEl));

            $('.riv-search-button', rdEl).click(function() {
                var rd = rome.find(rdEl);
                Mqe.ajaxJSON('/a/report_instance_for_viewer', {
                    report_name: $(modalEl).data('reportName'),
                    tags: Mqe.getSelectedTags(modalEl),
                    curr_report_instance_id: $(modalEl).data('currReportInstanceId'),
                    direction: null,
                    search_date: Mqe.toDate(Mqe.setTimezoneToUTC(rd.getDate()))
                }, function(resp) {
                    $(rdEl).hide();
                    rd.destroy();
                    Mqe.RIViewer._fillFromResp(modalEl, resp);
                });
            });
        };

        var rd = rome.find(rdEl);
        if (rd) {
            if (rd.destroyed) {
                $(rdEl).show();
                rd.restore();
                rd.show();
                tweakContent();
            } else {
                $(rdEl).hide();
                rd.destroy();
            }
        } else {
            getRomeOptions(function(options) {
                $(rdEl).show();
                rd = rome(rdEl, options);
                tweakContent();
            });
        }
    });

};

Mqe.RIViewer.cleanup = function(modalEl) {
    $('.riv-report-name', modalEl).html('');
    $('.riv-created', modalEl).html('');
    $('.riv-tags', modalEl).html('');
    $('.riv-id', modalEl).html('');
    $('.riv-parsing-result-table-wrap', modalEl).html('');
    $('.riv-calendar-content', modalEl).remove();
    $('.selected-tag-list', modalEl).html('');
    $('.riv-filter-tags-row', modalEl).hide();
    $('#riv-add-tag', modalEl).val('');
    $(modalEl).removeData('reportName');
    $(modalEl).removeData('reportId');
    $(modalEl).removeData('currReportInstanceId');
    $(modalEl).removeData('createdRaw');
};

Mqe.RIViewer._loadDefault = function(modalEl) {
    Mqe.ajaxJSON('/a/report_instance_for_viewer', {
        report_name: modalEl.data('reportName'),
        tags: Mqe.getSelectedTags(modalEl),
        curr_report_instance_id: null,
        direction: null
    }, function(resp) {
        Mqe.RIViewer._fillFromResp(modalEl, resp);
    });
};

Mqe.RIViewer.show = function(modalEl, reportName) {
    $('<div class="riv-calendar-content"></div>').insertAfter($('.riv-arrows', modalEl));

    $('.riv-report-name', modalEl).text(reportName);
    $(modalEl).data('reportName', reportName);
    Mqe.loadScriptOnce('rome-src', '/static/ext/rome-2.1.22.min.js', function() {
        Mqe.showModal(modalEl, function() { Mqe.RIViewer.cleanup(modalEl); });
        Mqe.RIViewer._loadDefault(modalEl);
    });
};

Mqe.RIViewer._fillFromResp = function(modalEl, resp) {
    if (!resp['success']) {
        $('.riv-id', modalEl).html('');
        $('.riv-created', modalEl).html('');
        $('.riv-tags-row', modalEl).hide();
        $('.riv-tags', modalEl).html('');
        $('.riv-parsing-result-table-wrap', modalEl).html('');

        $('.riv-prev', modalEl).toggleClass('clickable', false);
        $('.riv-prev', modalEl).toggleClass('riv-action-disabled', true);
        $('.riv-next', modalEl).toggleClass('clickable', false);
        $('.riv-next', modalEl).toggleClass('riv-action-disabled', true);
        return;
    }

    if (resp['result']['report_has_tags']) {
        $('.riv-filter-tags-row', modalEl).show();
    } else {
        $('.riv-filter-tags-row', modalEl).hide();
    }

    $(modalEl).data('reportId', resp['result']['report_id']);
    $(modalEl).data('currReportInstanceId', resp['result']['curr_report_instance_id']);

    if (!_.isEmpty(resp['result']['tags'])) {
        $('.riv-tags-row', modalEl).show();
        $('.riv-tags', modalEl).html(resp['result']['tags']);
    } else {
        $('.riv-tags-row', modalEl).hide();
        $('.riv-tags', modalEl).html('');
    }

    if (!_.isEmpty(resp['result']['created_raw'])) {
        $(modalEl).data('createdRaw', Mqe.convertDateToUTC(new Date(Mqe.enrichJSONObject(resp['result']['created_raw']))));
    }
    $('.riv-created', modalEl).html(resp['result']['created']);
    if (resp['result']['curr_report_instance_id']) {
        $('.riv-id', modalEl).html(resp['result']['curr_report_instance_id'].arg);
    } else {
        $('.riv-id', modalEl).html('');
    }
    $('.riv-parsing-result-table-wrap', modalEl).html(resp['result']['html_newest_table']);

    $('.riv-prev', modalEl).toggleClass('clickable', resp['result']['has_prev']);
    $('.riv-prev', modalEl).toggleClass('riv-action-disabled', !resp['result']['has_prev']);
    $('.riv-next', modalEl).toggleClass('clickable', resp['result']['has_next']);
    $('.riv-next', modalEl).toggleClass('riv-action-disabled', !resp['result']['has_next']);
};




// PART modal Messagebox


Mqe.Messagebox = {};

Mqe.Messagebox.cleanup = function(modalEl) {
    $(modalEl).remove();
};

Mqe.Messagebox.setup = function() {
};

Mqe.Messagebox.show = function(title, content) {
    var template = $('.modal-messagebox.prepared');
    var modalEl = Mqe.getPrepared(template);
    template.after(modalEl);
    $('.messagebox-button', modalEl).click(function() {
        Mqe.closeModal();
    });
    $('.messagebox-title', modalEl).html(title);
    $('.messagebox-content', modalEl).html(content);
    Mqe.log('filled', modalEl);
    Mqe.showModal(modalEl, function() {Mqe.Messagebox.cleanup(modalEl);});
};

Mqe.Messagebox.showFromSession = function() {
    _.forEach(Mqe.State.messageboxMessageList, function(msg) {
        Mqe.Messagebox.show(msg[0], msg[1]);
    });
    Mqe.State.messageboxMessageList = [];
};


