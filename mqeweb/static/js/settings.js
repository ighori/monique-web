Mqe.Settings = {};

Mqe.Settings.setupPreferences = function() {

    Mqe.autoselectText($('.ps-api-key'));

    $('.ps-key-reissue').click(function() {
        $('.ps-key-reissue-conf-wrap').slideToggle();
    });
};

