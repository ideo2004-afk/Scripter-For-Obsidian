import { App, PluginSettingTab, Setting } from 'obsidian';
import ScriptEditorPlugin from './main';

export interface ScriptEditorSettings {
    mySetting: string;
    geminiApiKey: string;
}

export const DEFAULT_SETTINGS: ScriptEditorSettings = {
    mySetting: 'default',
    geminiApiKey: ''
}

export class ScriptEditorSettingTab extends PluginSettingTab {
    plugin: ScriptEditorPlugin;

    constructor(app: App, plugin: ScriptEditorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Usage guide')
            .setHeading();

        new Setting(containerEl)
            .setName('AI Beat summary (Gemini 2.5 Flash)')
            .setDesc('Get your API key from Google AI Studio.')
            .addText(text => text
                .setPlaceholder('Enter your Gemini API key')
                .setValue(this.plugin.settings.geminiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.geminiApiKey = value.trim();
                    await this.plugin.saveSettings();
                })
                .inputEl.style.width = '350px');

        // Quick features
        new Setting(containerEl)
            .setName('Quick features')
            .setDesc('Automation and creation tools.')
            .setHeading();

        const featuresDiv = containerEl.createDiv();
        featuresDiv.createEl('li', { text: 'New Script Button: Click the scroll icon in the left ribbon to create a new screenplay.' });
        featuresDiv.createEl('li', { text: 'Story Board Mode: Activate the grid icon in the right sidebar for a holistic view of script structure.' });
        featuresDiv.createEl('li', { text: 'AI Beat Summary: Instantly generate scene summaries using Gemini AI.' });
        featuresDiv.createEl('li', { text: 'Character Quick Menu: Type @ to access frequently used character names.' });
        featuresDiv.createEl('li', { text: 'Renumber Scenes: Right-click in the editor to re-order your scene numbers automatically.' });

        // Screenplay Syntax
        new Setting(containerEl)
            .setName('Screenplay syntax')
            .setDesc('Basic rules for Fountain-compatible formatting.')
            .setHeading();

        const syntaxDiv = containerEl.createDiv();
        syntaxDiv.createEl('li', { text: 'Scene Heading: INT. / EXT. — Automatic bold & uppercase.' });
        syntaxDiv.createEl('li', { text: 'Character: @NAME — Centered. "@" is hidden in preview.' });
        syntaxDiv.createEl('li', { text: 'Dialogue: Text below Character — Automatically indented.' });
        syntaxDiv.createEl('li', { text: 'Parenthetical: (emotion) / OS: / VO: — Centered & italic.' });
        syntaxDiv.createEl('li', { text: 'Transition: CUT TO: / FADE IN — Right aligned.' });


        // Support
        const supportDiv = containerEl.createEl('div', { attr: { style: 'margin-top: 20px; border-top: 1px solid var(--background-modifier-border); padding-top: 20px;' } });
        supportDiv.createEl('p', { text: 'If you enjoy using Script Editor, consider supporting its development!' });
        const link = supportDiv.createEl('a', { href: 'https://buymeacoffee.com/ideo2004c' });
        link.createEl('img', {
            attr: {
                src: 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png',
                style: 'height: 40px;'
            }
        });
    }
}
