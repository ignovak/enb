/**
 * i18n-lang-js
 * ============
 *
 * Собирает `?.lang.<язык>.js`-файлы на основе `?.keysets.<язык>.js`-файлов.
 *
 * Используется для локализации в JS с помощью BEM.I18N.
 *
 * Исходные и конечные таргеты в данный момент не настраиваются (нет запроса).
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию — `?.lang.{lang}.js`.
 * * *String* **lang** — Язык, для которого небходимо собрать файл.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTechs([
 *   [ require('i18n-lang-js'), { lang: 'all'} ],
 *   [ require('i18n-lang-js'), { lang: '{lang}'} ],
 * ]);
 * ```
 */
var inherit = require('inherit'),
    fs = require('graceful-fs'),
    vowFs = require('vow-fs'),
    Vow = require('vow'),
    tanker = require('../exlib/tanker');

module.exports = require('../lib/build-flow').create()
    .name('i18n-lang-js')
    .target('target', '?.lang.{lang}.js')
    .defineRequiredOption('lang')
    .useSourceFilename('keysetsTarget', '?.keysets.{lang}.js')
    .builder(function(keysetsFilename) {
        delete require.cache[keysetsFilename];
        var keysets = require(keysetsFilename),
            _this = this,
            lang = this._lang,
            res = [];
        Object.keys(keysets).sort().forEach(function(keysetName) {
            res.push(_this.__self.getKeysetBuildResult(keysetName, keysets[keysetName], lang));
        });
        return this.getPrependJs(lang) + res.join('\n\n') + this.getAppendJs(lang);
    })
    .methods({
        getPrependJs: function(lang) {
            return '';
        },
        getAppendJs: function(lang) {
            return lang === 'all' ? '' : "\n\nBEM.I18N.lang('" + lang + "');\n";
        }
    })
    .staticMethods({
        getKeysetBuildResult: function(keysetName, keyset, lang) {
            var res = [];
            if (keysetName === '') {
                res.push(keyset);
            } else {
                res.push("BEM.I18N.decl('" + keysetName + "', {");
                Object.keys(keyset).map(function(key, i, arr) {
                    tanker.xmlToJs(keyset[key], function(js) {
                        res.push('    ' + JSON.stringify(key) + ': ' + js + (i === arr.length - 1 ? '' : ','));
                    });
                });
                res.push('}, {\n"lang": "' + lang + '"\n});');
            }
            return res.join('\n');
        }
    })
    .createTech();
