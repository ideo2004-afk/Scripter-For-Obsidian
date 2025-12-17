```
import { Plugin, Editor, MarkdownView, Menu } from 'obsidian';
import { Extension, RangeSetBuilder, StateField, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view';

// 劇本符號定義
const SCRIPT_MARKERS = {
    SCENE: '.',
    CHARACTER: '@',
    DIALOGUE_HALF: ':',
    DIALOGUE_FULL: '：',
    PARENTHETICAL: '(',
    TRANSITION: '>'
};

// CSS 類別對應
const CSS_CLASSES = {
    SCENE: 'script-scene',
    CHARACTER: 'script-character',
    DIALOGUE: 'script-dialogue',
    PARENTHETICAL: 'script-parenthetical',
    TRANSITION: 'script-transition',
    // Action 預設不用 class，或是用一個基本的
    ACTION: 'script-action'
};

export default class ScripterPlugin extends Plugin {
    async onload() {
        console.log('Loading Scripter for Obsidian (Fountain-Lite)');

        // 1. 註冊 Markdown Post Processor (用於閱讀模式 & PDF 輸出)
        this.registerMarkdownPostProcessor((element, context) => {
            const lines = element.querySelectorAll('p'); // Obsidian 通常把每一段當作 p 渲染
            
            lines.forEach(p => {
                const text = p.textContent || '';
                const format = this.detectFormat(text);
                
                if (format) {
                    p.addClass(format.cssClass);
                    // 移除標記符號，只顯示內容
                    // 注意：PDF 輸出時這裡會生效，讓符號消失
                    // 但為了避免破壞可能有意義的文字（極少），我們只移除開頭的那個符號
                    if (format.removePrefix) {
                        // 使用 Node 替換文字內容，避免破壞內部可能的 HTML (如粗體語法)
                        // 簡單起見，這裡假設劇本格式行內通常不包含複雜 Markdown
                        // 如果有，我們只處理第一個 child text node
                        this.stripMarkerFromElement(p, format.markerLength);
                    }
                } else {
                    // 預設動作 (Action)
                    p.addClass(CSS_CLASSES.ACTION);
                }
            });
        });

        // 2. 註冊 Editor Extension (用於 Live Preview 編輯模式)
        // 負責即時隱藏符號並套用 CSS
        this.registerEditorExtension(scriptingField);

        // 3. 右鍵選單 (Context Menu) - 插入對應符號
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Scripter")
                        .setIcon("film");

                    const subMenu = item.setSubmenu();

                    subMenu.addItem((item) => {
                        item.setTitle("Scene Heading (.)").setIcon("clapperboard")
                            .onClick(() => this.toggleLinePrefix(editor, SCRIPT_MARKERS.SCENE));
                    });

                    subMenu.addItem((item) => {
                        item.setTitle("Character (@)").setIcon("user")
                            .onClick(() => this.toggleLinePrefix(editor, SCRIPT_MARKERS.CHARACTER));
                    });

                    subMenu.addItem((item) => {
                        item.setTitle("Dialogue (:)")
                            .setIcon("message-circle")
                            .onClick(() => this.toggleLinePrefix(editor, SCRIPT_MARKERS.DIALOGUE_HALF));
                    });

                    subMenu.addItem((item) => {
                        item.setTitle("Parenthetical ( ( )").setIcon("italic")
                            .onClick(() => this.toggleLinePrefix(editor, SCRIPT_MARKERS.PARENTHETICAL));
                    });

                    subMenu.addItem((item) => {
                        item.setTitle("Transition (>)").setIcon("arrow-right")
                            .onClick(() => this.toggleLinePrefix(editor, SCRIPT_MARKERS.TRANSITION));
                    });
                     // Clear format
                     subMenu.addItem((item) => {
                        item.setTitle("Clear Format (Action)").setIcon("eraser")
                            .onClick(() => this.clearLinePrefix(editor));
                    });
                });
            })
        );
    }

    // 核心邏輯：偵測格式
    detectFormat(text: string): { cssClass: string, removePrefix: boolean, markerLength: number } | null {
        if (text.startsWith(SCRIPT_MARKERS.SCENE)) return { cssClass: CSS_CLASSES.SCENE, removePrefix: true, markerLength: 1 };
        if (text.startsWith(SCRIPT_MARKERS.CHARACTER)) return { cssClass: CSS_CLASSES.CHARACTER, removePrefix: true, markerLength: 1 };
        if (text.startsWith(SCRIPT_MARKERS.DIALOGUE_HALF)) return { cssClass: CSS_CLASSES.DIALOGUE, removePrefix: true, markerLength: 1 };
        if (text.startsWith(SCRIPT_MARKERS.DIALOGUE_FULL)) return { cssClass: CSS_CLASSES.DIALOGUE, removePrefix: true, markerLength: 1 };
        if (text.startsWith(SCRIPT_MARKERS.PARENTHETICAL)) return { cssClass: CSS_CLASSES.PARENTHETICAL, removePrefix: false, markerLength: 0 }; // 括號通常保留比較好看？或者您想移除開頭括號？先設為保留，因為通常後面有右括號
        if (text.startsWith(SCRIPT_MARKERS.TRANSITION)) return { cssClass: CSS_CLASSES.TRANSITION, removePrefix: true, markerLength: 1 };
        
        return null;
    }

    // 輔助：移除 PostProcessor 中的標記
    stripMarkerFromElement(element: HTMLElement, length: number) {
        // 遞迴找到第一個 Text Node 並移除前 N 個字元
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const firstTextNode = walker.nextNode();
        if (firstTextNode && firstTextNode.textContent) {
            if (firstTextNode.textContent.length >= length) {
                 firstTextNode.textContent = firstTextNode.textContent.substring(length);
            }
        }
    }

    // 輔助：在編輯器中切換符號
    toggleLinePrefix(editor: Editor, prefix: string) {
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);
        
        // 簡單邏輯：如果已經有其他前綴，替換掉；如果一樣，移除；如果沒有，加上
        let newLineContent = lineContent;
        
        // 移除已知的所有標記
        let hasMarker = false;
        for (const marker of Object.values(SCRIPT_MARKERS)) {
            if (lineContent.startsWith(marker)) {
                if (marker === prefix) {
                    // 已經是這個標記，則是 toggle off
                    newLineContent = lineContent.substring(marker.length);
                    hasMarker = true;
                    break;
                } else {
                    // 是別的標記，替換掉
                    newLineContent = prefix + lineContent.substring(marker.length);
                    hasMarker = true;
                    break;
                }
            }
        }

        if (!hasMarker) {
            newLineContent = prefix + lineContent;
        }

        editor.setLine(cursor.line, newLineContent);
    }

    clearLinePrefix(editor: Editor) {
         const cursor = editor.getCursor();
         const lineContent = editor.getLine(cursor.line);
         let newLineContent = lineContent;
         
         for (const marker of Object.values(SCRIPT_MARKERS)) {
            if (lineContent.startsWith(marker)) {
                newLineContent = lineContent.substring(marker.length);
                break;
            }
        }
        editor.setLine(cursor.line, newLineContent);
    }

    onunload() {
        console.log('Unloading Scripter');
    }
}

// ------------------------------------------------------------------
// CodeMirror 6 Extension for Live Preview
// ------------------------------------------------------------------

const scriptingField = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        
        for (const { from, to } of view.visibleRanges) {
            for (let pos = from; pos <= to;) {
                const line = view.state.doc.lineAt(pos);
                const text = line.text;
                
                // 1. 偵測格式
                let type: string | null = null;
                let markerLen = 0;

                if (text.startsWith(SCRIPT_MARKERS.SCENE)) { type = CSS_CLASSES.SCENE; markerLen = 1; }
                else if (text.startsWith(SCRIPT_MARKERS.CHARACTER)) { type = CSS_CLASSES.CHARACTER; markerLen = 1; }
                else if (text.startsWith(SCRIPT_MARKERS.DIALOGUE_HALF)) { type = CSS_CLASSES.DIALOGUE; markerLen = 1; }
                else if (text.startsWith(SCRIPT_MARKERS.DIALOGUE_FULL)) { type = CSS_CLASSES.DIALOGUE; markerLen = 1; }
                else if (text.startsWith(SCRIPT_MARKERS.PARENTHETICAL)) { type = CSS_CLASSES.PARENTHETICAL; markerLen = 0; } // 不隱藏括號
                else if (text.startsWith(SCRIPT_MARKERS.TRANSITION)) { type = CSS_CLASSES.TRANSITION; markerLen = 1; }
                else { type = CSS_CLASSES.ACTION; markerLen = 0; }

                if (type) {
                    // 套用整行樣式
                    builder.add(line.from, line.from, Decoration.line({
                        attributes: { class: type }
                    }));

                    // 2. 隱藏符號 (如果有的話，且不需要保留)
                    // 注意：只在 Cursor 不在此行時隱藏？
                    // 為了最佳體驗，我們使用 'replace' decoration 將符號替換為空，
                    // 但這在編輯時可能會有點怪 (看使用者習慣)。
                    // 比較安全的做法：只用 opacity 變淡，或者只有當 user 沒在編輯這行時才隱藏。
                    // 這裡先簡單做：用 CSS class 來讓符號本身變淡或消失。
                    // 但 CodeMirror 的 replace decoration 可以直接隱藏文字。
                    
                    if (markerLen > 0) {
                        // 檢查 cursor 是否在此行
                         // 這裡無法直接取得 cursor 位置進行動態更新 (效能考量)
                         // 但可以透過 CSS 針對 .cm-activeLine 來控制
                         
                         // 我們在符號位置加上一個 Decoration class，讓 CSS 決定是否隱藏
                         builder.add(line.from, line.from + markerLen, Decoration.mark({
                             class: 'script-marker' 
                         }));
                    }
                }

                pos = line.to + 1;
            }
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});
```
