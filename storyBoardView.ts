import { ItemView, WorkspaceLeaf, TFile, MarkdownView } from "obsidian";
import { SCENE_REGEX } from "./main";

export const STORYBOARD_VIEW_TYPE = "script-editor-storyboard-view";

export class StoryBoardView extends ItemView {
    file: TFile | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return STORYBOARD_VIEW_TYPE;
    }

    getDisplayText() {
        return this.file ? `Story Board: ${this.file.basename}` : "Story Board";
    }

    getIcon() {
        return "layout-grid";
    }

    async setFile(file: TFile) {
        this.file = file;
        await this.updateView();
    }

    async onOpen() {
        await this.updateView();
    }

    async updateView() {
        const container = this.containerEl.children[1] as HTMLElement;
        const scrollPos = container.scrollTop;
        container.empty();
        container.addClass('script-editor-storyboard-container');

        if (!this.file) {
            container.createEl('div', { text: 'No file selected', cls: 'pane-empty' });
            return;
        }

        const headerEl = container.createDiv({ cls: 'storyboard-header' });
        headerEl.createEl('h2', { text: this.file.basename });

        const closeBtn = headerEl.createEl('button', { text: 'Back to Editor', cls: 'storyboard-back-btn' });
        closeBtn.onClickEvent(async () => {
            await this.leaf.setViewState({
                type: 'markdown',
                state: { file: this.file?.path }
            });
        });

        const gridEl = container.createDiv({ cls: 'storyboard-grid' });

        const content = await this.app.vault.read(this.file);
        const lines = content.split('\n');

        // Use the same summary length setting
        const settings = (this.app as any).plugins.getPlugin('script-editor')?.settings;
        const summaryLength = settings?.summaryLength ?? 50;

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (SCENE_REGEX.test(trimmed)) {
                // Extract summary
                let summary = "";
                let scanIdx = index + 1;
                while (summary.length < summaryLength && scanIdx < lines.length) {
                    const scanLine = lines[scanIdx].trim();
                    if (scanLine && !SCENE_REGEX.test(scanLine) && !scanLine.startsWith('#')) {
                        const clean = scanLine.replace(/^[@.((（].+?[)）:]?|[:：]/g, '').trim();
                        summary += (summary ? " " : "") + clean;
                    }
                    if (SCENE_REGEX.test(scanLine) || scanLine.startsWith('#')) break;
                    scanIdx++;
                }
                if (summary.length > summaryLength) summary = summary.substring(0, summaryLength) + "...";

                const cardEl = gridEl.createDiv({ cls: 'storyboard-card' });
                cardEl.createDiv({ text: trimmed, cls: 'storyboard-card-title' });
                if (summary) {
                    cardEl.createDiv({ text: summary, cls: 'storyboard-card-summary' });
                }

                cardEl.onClickEvent(() => {
                    this.navToLine(index);
                });
            }
        });

        // Restore scroll position
        container.scrollTop = scrollPos;
    }

    private async navToLine(line: number) {
        if (!this.file) return;

        // Switch back to markdown view and jump to line
        const leaf = this.leaf;
        await leaf.setViewState({
            type: 'markdown',
            state: { file: this.file.path }
        });

        const view = leaf.view;
        if (view instanceof MarkdownView) {
            view.editor.setCursor({ line: line, ch: 0 });
            view.editor.focus();
            const linePos = view.editor.getCursor();
            view.editor.scrollIntoView({ from: linePos, to: linePos }, true);
        }
    }
}
