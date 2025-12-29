import { MarkdownPostProcessorContext } from 'obsidian';
import ScriptEditorPlugin, {
    CSS_CLASSES,
    COLOR_TAG_REGEX,
    SUMMARY_REGEX,
    NOTE_REGEX
} from './main';

export function registerReadingView(plugin: ScriptEditorPlugin) {
    plugin.registerMarkdownPostProcessor((element, context) => {
        const fm = context.frontmatter;
        const cls = fm?.cssclasses || fm?.cssclass || [];
        const classesArray = Array.isArray(cls) ? cls : (typeof cls === 'string' ? [cls] : []);

        if (!classesArray.includes('fountain') && !classesArray.includes('script')) {
            return;
        }

        const leaves = element.querySelectorAll('p, li');
        leaves.forEach((node: HTMLElement) => {
            if (node.dataset.scriptProcessed) return;

            const text = node.innerText?.trim() || "";
            if (!text) return;

            // Obsidian naturally hides %% tags in Reading Mode, 
            // but we check them here to ensure we don't style them as 'Action'
            if (COLOR_TAG_REGEX.test(text) || SUMMARY_REGEX.test(text) || NOTE_REGEX.test(text)) {
                node.style.display = 'none';
                node.dataset.scriptProcessed = "true";
                return;
            }

            if (text.startsWith('#')) return;

            // Split merged paragraphs by newline to handle Reading Mode's merging behavior
            const lines = text.split('\n');
            node.empty();
            node.dataset.scriptProcessed = "true";

            let previousType: string | null = null;

            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                const format = plugin.detectExplicitFormat(trimmedLine);
                let cssClass = CSS_CLASSES.ACTION;
                let currentType = 'ACTION';

                if (format) {
                    cssClass = format.cssClass;
                    currentType = format.typeKey;
                } else if (previousType === 'CHARACTER' || previousType === 'PARENTHETICAL' || previousType === 'DIALOGUE') {
                    // Inherited Dialogue logic
                    cssClass = CSS_CLASSES.DIALOGUE;
                    currentType = 'DIALOGUE';
                }

                const lineEl = node.createDiv({ cls: cssClass });
                lineEl.setText(trimmedLine);

                previousType = currentType;
            });
        });
    });
}
