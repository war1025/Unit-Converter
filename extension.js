const St = imports.gi.St;
const Main = imports.ui.main;
const Search = imports.ui.search;
const SearchDisplay = imports.ui.searchDisplay;
const IconGrid = imports.ui.iconGrid;
const GLib = imports.gi.GLib;

const MAX_SEARCH_RESULTS_ROWS = 1;
const ICON_SIZE = 81;

let unitProvider = "";

function CalcResult(result) {
    this._init(result);
}

CalcResult.prototype = {
    _init: function(resultMeta) {

        this.actor = new St.Bin({ style_class: 'contact',
                                  reactive: true,
                                  track_hover: true });

        let content = new St.BoxLayout( { style_class: 'contact-content',
                                          vertical: false });
        this.actor.set_child(content);

        let icon = new St.Icon({ icon_type: St.IconType.FULLCOLOR,
                                 icon_size: ICON_SIZE,
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
    }

};

function UnitProvider() {
    this._init.apply(this, arguments);
}

UnitProvider.prototype = {
    __proto__: Search.SearchProvider.prototype,

    _init: function(title) {
        Search.SearchProvider.prototype._init.call(this, title);
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
				let [success, out, err, error] = GLib.spawn_sync(null, ["units", one, two], null, 4, null)
				if(error == 0) {
					result = out.toString().split('\n')[0];
					if(result.indexOf("*") == 1) {
						result = result.substring(3);
					} else {
						result = result.substring(1);
					}
					this._lastResult = result;
					return [{'expr': expr, 'result': result}];
				}
            } catch(exp) {
            }
        }

        return [];
    },

    getSubsearchResultSet: function(prevResults, terms) {
        return this.getInitialResultSet(terms);
    },

    getResultMetas: function(result) {
		let metas = [];
		for(let i = 0; i < result.length; i++) {
			metas.push({'id' : i, 'result' : result[i].result, 'expr' : result[i].expr});
		}
        return metas;
    },

    createResultActor: function(resultMeta, terms) {
        let result = new CalcResult(resultMeta);
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
}

function init() {
    unitProvider = new UnitProvider('UNIT CONVERTER');
}

function enable() {
    Main.overview.addSearchProvider(unitProvider);
}

function disable() {
    Main.overview.removeSearchProvider(unitProvider);
}
