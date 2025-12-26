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

    async setState(state: any, result: any): Promise<void> {
        if (state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (file instanceof TFile) {
                this.file = file;
            }
        }
        await super.setState(state, result);
        await this.updateView();
    }

    async onOpen() {
        this.addAction("pencil", "Live View", async () => {
            if (this.file) {
                await this.leaf.setViewState({
                    type: "markdown",
                    state: {
                        file: this.file.path,
                        mode: "source"
                    }
                });
            }
        });

        this.addAction("book-open", "Reading Mode", async () => {
            if (this.file) {
                await this.leaf.setViewState({
                    type: "markdown",
                    state: {
                        file: this.file.path,
                        mode: "preview"
                    }
                });
            }
        });
    }

    async updateView() {
        const container = this.contentEl;
        if (!container) return; // Guard

        const scrollPos = container.scrollTop;
        container.empty();
        container.addClass('script-editor-storyboard-container');

        if (!this.file) {
            container.createEl('div', { text: 'No file selected', cls: 'pane-empty' });
            return;
        }

        const headerEl = container.createDiv({ cls: 'storyboard-header' });
        headerEl.createEl('h2', { text: this.file.basename });

        // --- Block Parsing Logic ---
        const content = await this.app.vault.read(this.file);
        const lines = content.split('\n');
        const settings = (this.app as any).plugins.getPlugin('script-editor')?.settings;
        const summaryLength = settings?.summaryLength ?? 50;

        interface ScriptBlock {
            id: string;
            type: 'preamble' | 'h2' | 'scene';
            title: string;
            contentLines: string[];
            originalLine: number;
        }

        const blocks: ScriptBlock[] = [];
        let currentBlock: ScriptBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'preamble',
            title: '',
            contentLines: [],
            originalLine: 0
        };
        blocks.push(currentBlock);

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('## ')) {
                currentBlock = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'h2',
                    title: trimmed.replace(/^##\s+/, ''),
                    contentLines: [line],
                    originalLine: index
                };
                blocks.push(currentBlock);
            } else if (SCENE_REGEX.test(trimmed)) {
                currentBlock = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'scene',
                    title: trimmed,
                    contentLines: [line],
                    originalLine: index
                };
                blocks.push(currentBlock);
            } else {
                currentBlock.contentLines.push(line);
            }
        });

        // --- Rendering Logic ---
        let currentGrid: HTMLElement | null = null;

        blocks.forEach((block, blockIdx) => {
            if (block.type === 'h2') {
                const h2Div = container.createDiv({ cls: 'storyboard-h2-section' });
                h2Div.createEl('h3', { text: block.title, cls: 'storyboard-h2-title' });
                currentGrid = h2Div.createDiv({ cls: 'storyboard-grid' });
            } else if (block.type === 'scene') {
                if (!currentGrid) {
                    currentGrid = container.createDiv({ cls: 'storyboard-grid' });
                }

                let summary = "";
                for (let i = 1; i < block.contentLines.length; i++) {
                    const sLine = block.contentLines[i].trim();
                    if (sLine && !sLine.startsWith('#')) {
                        const clean = sLine.replace(/^[@.((（].+?[)）:]?|[:：]/g, '').trim();
                        summary += (summary ? " " : "") + clean;
                    }
                    if (summary.length >= summaryLength) break;
                }
                if (summary.length > summaryLength) summary = summary.substring(0, summaryLength) + "...";

                const cardEl = currentGrid.createDiv({ cls: 'storyboard-card' });
                cardEl.setAttribute('draggable', 'true');
                cardEl.createDiv({ text: block.title, cls: 'storyboard-card-title' });
                if (summary) {
                    cardEl.createDiv({ text: summary, cls: 'storyboard-card-summary' });
                }

                // Drag and Drop implementation
                cardEl.addEventListener('dragstart', (e) => {
                    (e as DragEvent).dataTransfer?.setData('text/plain', blockIdx.toString());
                    cardEl.addClass('is-dragging');
                });

                cardEl.addEventListener('dragend', () => {
                    cardEl.removeClass('is-dragging');
                    container.querySelectorAll('.storyboard-card').forEach(el => {
                        el.removeClass('drag-over-left', 'drag-over-right');
                    });
                });

                cardEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const dragEvent = e as DragEvent;
                    const rect = cardEl.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;

                    cardEl.removeClass('drag-over-left', 'drag-over-right');
                    if (dragEvent.clientX < midX) {
                        cardEl.addClass('drag-over-left');
                    } else {
                        cardEl.addClass('drag-over-right');
                    }
                });

                cardEl.addEventListener('dragleave', () => {
                    cardEl.removeClass('drag-over-left', 'drag-over-right');
                });

                cardEl.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    const fromIdx = parseInt((e as DragEvent).dataTransfer?.getData('text/plain') || "-1");
                    const rect = cardEl.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    const dropOnRight = (e as DragEvent).clientX > midX;

                    let toIdx = blockIdx;
                    // If dropping on right, we increment toIdx to insert AFTER
                    if (dropOnRight) toIdx++;

                    if (fromIdx !== -1) {
                        // Adjust if we are moving forward to account for the removed element
                        let adjustedTo = toIdx;
                        if (fromIdx < toIdx) adjustedTo--;

                        if (fromIdx !== adjustedTo) {
                            await this.moveBlock(blocks, fromIdx, toIdx);
                        }
                    }
                });

                cardEl.onClickEvent(() => {
                    this.navToLine(block.originalLine);
                });
            }
        });

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
    private async moveBlock(blocks: any[], fromIdx: number, toIdx: number) {
        const movedBlock = blocks[fromIdx];

        // Use a more predictable approach for insertion
        const tempBlocks = [...blocks];
        tempBlocks.splice(fromIdx, 1);

        // Recalculate insertion point in the shrunk array
        let adjustedTo = toIdx;
        if (fromIdx < toIdx) adjustedTo--;

        tempBlocks.splice(adjustedTo, 0, movedBlock);

        // Reconstruct file content
        const newContent = tempBlocks.map(b => b.contentLines.join('\n')).join('\n');

        if (this.file) {
            await this.app.vault.modify(this.file, newContent);
            setTimeout(() => {
                this.updateView();
            }, 50);
        }
    }
}
