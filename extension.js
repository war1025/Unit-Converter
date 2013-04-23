const St = imports.gi.St;
const Main = imports.ui.main;
const Search = imports.ui.search;
const SearchDisplay = imports.ui.searchDisplay;
const IconGrid = imports.ui.iconGrid;
const Lang = imports.lang;
const GLib = imports.gi.GLib;

const MAX_SEARCH_RESULTS_ROWS = 1;
const ICON_SIZE = 81;

let unitProvider = "";

const UnitResult = new Lang.Class({
    Name: 'UnitResult',

    _init: function(resultMeta) {

        this.actor = new St.Bin({ style_class: 'contact',
                                  reactive: true,
                                  track_hover: true });

        let content = new St.BoxLayout( { style_class: 'contact-content',
                                          vertical: false });
        this.actor.set_child(content);

        let icon = new St.Icon({ icon_size: ICON_SIZE,
                                 icon_name: 'accessories-calculator',
                                 style_class: 'contact-icon' });

        content.add(icon, { x_fill: true,
                            y_fill: false,
                            x_align: St.Align.START,
                            y_align: St.Align.MIDDLE });

        let result = new St.BoxLayout({ style_class: 'contact-details',
                                        vertical: true });

        content.add(result, { x_fill: true, x_align: St.Align.START });

        let exprLabel = new St.Label({ text: resultMeta.expr,
                                         style_class: 'result-expression' });
        let resultLabel = new St.Label({ text: resultMeta.result,
                                         style_class: 'result-result' });

        result.add(exprLabel, { x_fill: false, x_align: St.Align.START });
        result.add(resultLabel, { x_fill: false, x_align: St.Align.START });
        result.set_width(400);
    }

});

const UnitProvider = new Lang.Class({
    Name: 'UnitProvider',
    Extends: Search.SearchProvider,

    _init: function(title) {
        this.parent(title);
    },

    _tempRegex: /^(-?[0-9]+\.?[0-9]*)\s*([FCK]) ([FCK])$/i,

    _isTempConversion: function(term1, term2) {
        return this._tempRegex.test(term1.concat(" ", term2))
    },

    _tempConversionRewrite: function(term1, term2) {
        var parts = this._tempRegex.exec(term1.concat(" ", term2))
        return ["temp".concat(parts[2].toUpperCase(), "(", parts[1], ")"), "temp".concat(parts[3].toUpperCase())];
    },

    getInitialResultSet: function(terms) {
        terms = terms.slice();
        var valid = false;
        var split = 0;
        for(var i in terms) {
            if(terms[i] == "to") {
                valid = true;
                split = i;
                break;
            }
        }
        if (valid) {
            let one = terms.splice(0, split).join(" ");
            let two = terms.splice(1).join(" ");
            let expr = one.concat(" to ", two);

            if(this._isTempConversion(one, two)) {
                [one, two] = this._tempConversionRewrite(one, two);
            }

            try {
                let [success, out, err, error] = GLib.spawn_sync(null, ["units", "-t", one, two], null, 4, null)
                if(error == 0) {
                    result = out.toString();
                    this._lastResult = result;
                    this.searchSystem.pushResults(this,
                            [{'expr': expr, 'result': result}]);
                    return [{'expr': expr, 'result': result}];
                }
            } catch(exp) {
            }
        }

        this.searchSystem.pushResults(this, []);
        return [];
    },

    getSubsearchResultSet: function(prevResults, terms) {
        return this.getInitialResultSet(terms);
    },

    getResultMetas: function(result, callback) {
        let metas = [];
        for(let i = 0; i < result.length; i++) {
            metas.push({'id' : i, 'result' : result[i].result, 'expr' : result[i].expr});
        }
        callback(metas)
        return metas;
    },

    createResultActor: function(resultMeta, terms) {
        let result = new UnitResult(resultMeta);
        return result.actor;
    },

    createResultContainerActor: function() {
        let grid = new IconGrid.IconGrid({ rowLimit: MAX_SEARCH_RESULTS_ROWS,
                                           xAlign: St.Align.START });
        grid.actor.style_class = 'contact-grid';

        let actor = new SearchDisplay.GridSearchResults(this, grid);
        return actor;
    },

    activateResult: function(resultId) {
        if(this._lastResult) {
            St.Clipboard.get_default().set_text(this._lastResult.replace("\n", ""));
        }
        return true;
    }
});

function init() {
    unitProvider = new UnitProvider('UNIT CONVERTER');
}

function enable() {
    Main.overview.addSearchProvider(unitProvider);
}

function disable() {
    Main.overview.removeSearchProvider(unitProvider);
}
