import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { panel } from 'resource:///org/gnome/shell/ui/main.js'
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

const LAYOUT_FLAGS = {
    'us': '🇺🇸',
    'gb': '🇬🇧', 
    'de': '🇩🇪',
    'fr': '🇫🇷',
    'es': '🇪🇸',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'ru': '💩',
    'pl': '🇵🇱',
    'cz': '🇨🇿',
    'sk': '🇸🇰',
    'hu': '🇭🇺',
    'ro': '🇷🇴',
    'bg': '🇧🇬',
    'hr': '🇭🇷',
    'rs': '🇷🇸',
    'si': '🇸🇮',
    'ba': '🇧🇦',
    'mk': '🇲🇰',
    'al': '🇦🇱',
    'gr': '🇬🇷',
    'tr': '🇹🇷',
    'ua': '🇺🇦',
    'by': '🇧🇾',
    'lt': '🇱🇹',
    'lv': '🇱🇻',
    'ee': '🇪🇪',
    'fi': '🇫🇮',
    'se': '🇸🇪',
    'no': '🇳🇴',
    'dk': '🇩🇰',
    'is': '🇮🇸',
    'nl': '🇳🇱',
    'be': '🇧🇪',
    'ch': '🇨🇭',
    'at': '🇦🇹',
    'lu': '🇱🇺',
    'jp': '🇯🇵',
    'kr': '🇰🇷',
    'cn': '🇨🇳',
    'tw': '🇹🇼',
    'hk': '🇭🇰',
    'in': '🇮🇳',
    'th': '🇹🇭',
    'vn': '🇻🇳',
    'id': '🇮🇩',
    'my': '🇲🇾',
    'sg': '🇸🇬',
    'ph': '🇵🇭',
    'br': '🇧🇷',
    'ar': '🇦🇷',
    'mx': '🇲🇽',
    'ca': '🇨🇦',
    'au': '🇦🇺',
    'nz': '🇳🇿',
    'za': '🇿🇦',
    'eg': '🇪🇬',
    'ma': '🇲🇦',
    'il': '🇮🇱',
    'sa': '🇸🇦',
    'ae': '🇦🇪',
    'ir': '🇮🇷',
    'pk': '🇵🇰',
    'bd': '🇧🇩',
    'lk': '🇱🇰',
    'mm': '🇲🇲',
    'kh': '🇰🇭',
    'la': '🇱🇦',
    'mn': '🇲🇳',
    'kz': '🇰🇿',
    'uz': '🇺🇿',
    'kg': '🇰🇬',
    'tj': '🇹🇯',
    'tm': '🇹🇲',
    'af': '🇦🇫',
    'am': '🇦🇲',
    'az': '🇦🇿',
    'ge': '🇬🇪',
    'md': '🇲🇩',
    'me': '🇲🇪',
    'xk': '🇽🇰', 
    'default': '⌨️'
};

const BanderaIndicator = GObject.registerClass(
    class BanderaIndicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'BanderaIndicator');

            this._settings = extension.getSettings();
            this._keyboard = panel.statusArea.keyboard;
            this._keyboardWatching = null;

            this._flagLabel = new St.Label({
                text: LAYOUT_FLAGS.default,
                style_class: 'bandera-label',
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._flagLabel);

            this._inputSourceManager = Main.inputMethod._inputSourceManager;

            this._buildMenu();

            this._inputSourceChangedId = this._inputSourceManager.connect(
                'current-source-changed',
                this._onLayoutChanged.bind(this)
            );

            this._switchSystemIndicator();

            this._settingsConnection = this._settings.connect('changed', () => this._switchSystemIndicator());
        }

        _buildMenu() {
            this._layoutSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._layoutSection);

            this._updateLayouts();

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const showLayoutItem = new PopupMenu.PopupMenuItem(_('Show Keyboard Layout'));
            showLayoutItem.connect('activate', () => this._showKeyboardLayout());
            this.menu.addMenuItem(showLayoutItem);

            const settingsItem = new PopupMenu.PopupMenuItem(_('Keyboard Settings'));
            settingsItem.connect('activate', () => this._openKeyboardSettings());
            this.menu.addMenuItem(settingsItem);
        }

        _updateLayouts() {
            this._layoutSection.removeAll();

            const sources = this._inputSourceManager.inputSources;
            const currentSource = this._inputSourceManager.currentSource;
            let labelText = LAYOUT_FLAGS.default;

            for (const [id, source] of Object.entries(sources)) {
                const layoutId = this._extractLayoutId(source.id);
                const flag = this._getFlag(layoutId);
                const displayName = source.displayName || source.id;

                const item = new PopupMenu.PopupMenuItem('');

                const itemBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true
                });

                // name on the left
                const nameLabel = new St.Label({
                    text: displayName,
                    x_expand: true,
                    x_align: Clutter.ActorAlign.START
                });
                itemBox.add_child(nameLabel);

                // flag on the right
                let flagLabel = new St.Label({
                    text: flag,
                    x_align: Clutter.ActorAlign.END,
                    style: 'margin-left: 10px;'
                });
                itemBox.add_child(flagLabel);

                // replace the default label with our custom box
                item.remove_child(item.label);
                item.add_child(itemBox);

                if (currentSource && source.id === currentSource.id) {
                    item.setOrnament(PopupMenu.Ornament.DOT);
                    labelText = flag;
                } else {
                    item.setOrnament(PopupMenu.Ornament.RADIO);
                }
                item.connect('activate', () => {
                    source.activate(true);
                    item._parent._getTopMenu().close();
                });
                this._layoutSection.addMenuItem(item);
            }

            this._flagLabel.text = labelText;
        }

        _onLayoutChanged() {
            this._updateLayouts();
        }

        _extractLayoutId(sourceId) {
            // Handle different input source ID formats
            // Examples: "xkb:us::eng", "xkb:de::ger", "ibus:libpinyin"

            if (sourceId.startsWith('xkb:')) {
                const parts = sourceId.split(':');
                return parts[1] || 'us';
            } else if (sourceId.startsWith('ibus:')) {
                const engine = sourceId.replace('ibus:', '');

                // Map common IBus engines to country codes
                const ibusMapping = {
                    'libpinyin': 'cn',
                    'hangul': 'kr',
                    'anthy': 'jp',
                    'mozc': 'jp',
                    'rime': 'cn',
                    'table': 'cn',
                    'chewing': 'tw',
                    'unikey': 'vn',
                    'm17n:hi:itrans': 'in',
                    'm17n:ar:kbd': 'sa',
                    'm17n:fa:isiri': 'ir',
                    'm17n:th:kesmanee': 'th',
                    'm17n:my:zawgyi': 'mm',
                    'm17n:bn:itrans': 'bd',
                    'm17n:ta:tamil99': 'in',
                    'm17n:te:itrans': 'in',
                    'm17n:ml:itrans': 'in',
                    'm17n:kn:itrans': 'in',
                    'm17n:gu:itrans': 'in',
                    'm17n:pa:itrans': 'in',
                    'm17n:or:itrans': 'in',
                    'm17n:as:itrans': 'in'
                };
                return ibusMapping[engine] || 'default';
            }
            return sourceId;
        }

        _getFlag(layoutId) {
            layoutId = layoutId.toLowerCase();

            // Handle special cases and variants
            const mappings = {
                'eng': 'us',
                'ger': 'de',
                'fra': 'fr',
                'spa': 'es',
                'ita': 'it',
                'por': 'pt',
                'rus': 'ru',
                'pol': 'pl',
                'cze': 'cz',
                'hun': 'hu',
                'rom': 'ro',
                'bul': 'bg',
                'hrv': 'hr',
                'srp': 'rs',
                'slv': 'si',
                'bos': 'ba',
                'mkd': 'mk',
                'alb': 'al',
                'gre': 'gr',
                'tur': 'tr',
                'ukr': 'ua',
                'bel': 'by',
                'lit': 'lt',
                'lav': 'lv',
                'est': 'ee',
                'fin': 'fi',
                'swe': 'se',
                'nor': 'no',
                'dan': 'dk',
                'ice': 'is',
                'dut': 'nl',
                'fle': 'be',
                'ger(switzerland)': 'ch',
                'austria': 'at',
                'jpn': 'jp',
                'kor': 'kr',
                'chi': 'cn',
                'taiwanese': 'tw',
                'hongkong': 'hk',
                'ind': 'in',
                'tha': 'th',
                'vie': 'vn',
                'indonesian': 'id',
                'malay': 'my',
                'singapore': 'sg',
                'filipino': 'ph',
                'portuguese(brazil)': 'br',
                'spanish(argentina)': 'ar',
                'spanish(mexico)': 'mx',
                'canadian': 'ca',
                'australian': 'au',
                'newzealand': 'nz'
            };

            if (mappings[layoutId]) {
                layoutId = mappings[layoutId];
            }

            return LAYOUT_FLAGS[layoutId] || LAYOUT_FLAGS.default;
        }

        _switchSystemIndicator() {
            const hide = this._settings.get_boolean('hide-system-indicator');
            if (hide) {
                this._keyboard.hide()
                this._keyboardWatching = this._keyboard.connect('notify::visible', () => this._keyboard.hide());
            } else {
                if (this._keyboardWatching) {
                    this._keyboard.disconnect(this._keyboardWatching);
                    this._keyboardWatching = null;
                }
                this._keyboard.show();
            }
        }

        _showKeyboardLayout() {
            try {
                Gio.Subprocess.new(['tecla'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                console.error('Could not open keyboard settings:', e);
                Main.notify('Bandera', _('No keyboard layout viewer found. Install Tecla or similar.'));
            }
        }

        _openKeyboardSettings() {
            try {
                Gio.Subprocess.new(['gnome-control-center', 'keyboard'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                console.error('Could not open keyboard settings:', e);
                Main.notify('Bandera', _('Could not open keyboard settings.'));
            }
        }

        destroy() {
            if (this._inputSourceChangedId) {
                this._inputSourceManager.disconnect(this._inputSourceChangedId);
                this._inputSourceChangedId = null;
            }
            if (this._settingsConnection) {
                this._settings.disconnect(this._settingsConnection);
                this._settingsConnection = null;
            }
            if (this._keyboardWatching) {
                this._keyboard.disconnect(this._keyboardWatching);
                this._keyboardWatching = null;
            }
            this._keyboard.show();
            super.destroy();
        }
    }
);

export default class BanderaExtension extends Extension {
    enable() {
        this._indicator = new BanderaIndicator(this);
        Main.panel.addToStatusArea('bandera-indicator', this._indicator, Main.panel._rightBox.get_n_children() - 1, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
