
/*
    Scripter for Obsidian (No-Compile CommonJS Version)
    v2.2 - Pure Text Transitions
*/

const obsidian = require('obsidian');

// Script Symbols
const SCRIPT_MARKERS = {
    CHARACTER: '@',
    PARENTHETICAL: '(',
};

// Regex Definitions
const SCENE_REGEX = /^(\d+[\.\s]\s*)?((?:INT|EXT|INT\/EXT|I\/E)[\.\s])/i;
const TRANSITION_REGEX = /^((?:FADE (?:IN|OUT)|[A-Z\s]+ TO)(?:[:\.]?))$/;
// 支援 (開頭，或是 OS: / VO: 開頭
const PARENTHETICAL_REGEX = /^(\(|OS:|VO:)/i;

// CSS Classes
const CSS_CLASSES = {
    SCENE: 'script-scene',
    CHARACTER: 'script-character',
    DIALOGUE: 'script-dialogue',
    PARENTHETICAL: 'script-parenthetical',
    TRANSITION: 'script-transition',
    ACTION: 'script-action'
};

class ScripterPlugin extends obsidian.Plugin {
    async onload() {
        console.log('Loading Scripter (Standard Transitions)');

        // 1. Command: Renumber Scenes
        this.addCommand({
            id: 'scripter-renumber-scenes',
            name: 'Renumber Scenes',
            editorCallback: (editor) => this.renumberScenes(editor)
        });

        // 2. Post Processor
        this.registerMarkdownPostProcessor((element, context) => {
            // Include 'li' to handle numbered lists (created by Renumber Scenes command)
            const lines = Array.from(element.querySelectorAll('p, div, blockquote, li'));
            let previousType = null;

            for (let i = 0; i < lines.length; i++) {
                let p = lines[i];
                // 使用 innerHTML 來偵測換行，這是解決 PDF 輸出時 DOM 結構合併問題的關鍵
                let rawContent = p.innerHTML;

                // 1. 偵測 "Character + Dialogue" 的合併段落 (針對 PDF/特殊顯視修復)
                const splitRegex = /<br\s*\/?>|\n/i;
                const match = rawContent.match(splitRegex);

                if (match) {
                    const splitIndex = match.index;
                    const splitLen = match[0].length;

                    // 取得第一行純文字以進行判斷
                    const tempDiv = document.createElement('div');
                    const firstPartHtml = rawContent.substring(0, splitIndex);
                    tempDiv.innerHTML = firstPartHtml;
                    const firstPartText = tempDiv.textContent.trim();
                    const firstFormat = this.detectExplicitFormat(firstPartText);

                    if (firstFormat?.typeKey === 'CHARACTER') {
                        // 命中！確認為合併段落，執行切分

                        // Action 1: 將原本的 P 轉回純角色名 (applyFormat 會處理樣式)
                        p.textContent = firstPartText;
                        this.applyFormatToElement(p, firstFormat);
                        previousType = 'CHARACTER';

                        // Action 2: 創建新的 P 作為對白
                        const remainingHtml = rawContent.substring(splitIndex + splitLen);
                        tempDiv.innerHTML = remainingHtml;
                        const remainingText = tempDiv.textContent.trim();

                        // 只有當剩下有內容時才建立
                        if (remainingText) {
                            const newP = document.createElement('p');
                            newP.textContent = remainingText;
                            newP.addClass(CSS_CLASSES.DIALOGUE);
                            p.insertAdjacentElement('afterend', newP);
                            previousType = 'DIALOGUE';
                        }

                        continue; // 完成此元素處理，跳下一行
                    }
                }

                // 2. 正常單行處理 (原本的邏輯)
                let text = p.textContent.trim();
                if (!text) {
                    previousType = null;
                    continue;
                }

                const explicitFormat = this.detectExplicitFormat(text);

                if (explicitFormat) {
                    this.applyFormatToElement(p, explicitFormat);
                    previousType = explicitFormat.typeKey;
                } else {
                    // Auto-Dialogue Detection
                    if (previousType === 'CHARACTER' || previousType === 'PARENTHETICAL') {
                        p.addClass(CSS_CLASSES.DIALOGUE);
                        previousType = 'DIALOGUE';
                    } else {
                        p.addClass(CSS_CLASSES.ACTION);
                        previousType = 'ACTION';
                    }
                }
            }
        });

        // 3. Context Menu
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item.setTitle("Scripter").setIcon("film");
                    const subMenu = item.setSubmenu();

                    // Scene Heading Submenu
                    subMenu.addItem((startItem) => {
                        startItem.setTitle("Scene Heading").setIcon("clapperboard");
                        const sceneMenu = startItem.setSubmenu();
                        sceneMenu.addItem(i => i.setTitle("EXT.").onClick(() => this.insertText(editor, "EXT. ", false)));
                        sceneMenu.addItem(i => i.setTitle("INT.").onClick(() => this.insertText(editor, "INT. ", false)));
                        sceneMenu.addItem(i => i.setTitle("I/E.").onClick(() => this.insertText(editor, "INT./EXT. ", false)));
                    });

                    this.addMenuItem(subMenu, "Character (@)", "user", editor, SCRIPT_MARKERS.CHARACTER);
                    this.addMenuItem(subMenu, "Parenthetical ( ( )", "italic", editor, SCRIPT_MARKERS.PARENTHETICAL);

                    // Transition Submenu
                    subMenu.addItem((item) => {
                        item.setTitle("Transition").setIcon("arrow-right");
                        const m = item.setSubmenu();
                        m.addItem(i => i.setTitle("CUT TO:").onClick(() => this.insertText(editor, "CUT TO:", true)));
                        m.addItem(i => i.setTitle("FADE OUT.").onClick(() => this.insertText(editor, "FADE OUT.", true)));
                        m.addItem(i => i.setTitle("FADE IN:").onClick(() => this.insertText(editor, "FADE IN:", true)));
                        m.addItem(i => i.setTitle("DISSOLVE TO:").onClick(() => this.insertText(editor, "DISSOLVE TO:", true)));
                    });

                    subMenu.addSeparator();

                    subMenu.addItem((subItem) => {
                        subItem.setTitle("Renumber Scenes").setIcon("list-ordered")
                            .onClick(() => this.renumberScenes(editor));
                    });

                    subMenu.addItem((subItem) => {
                        subItem.setTitle("Clear Format").setIcon("eraser")
                            .onClick(() => this.clearLinePrefix(editor));
                    });
                });
            })
        );
    }

    addMenuItem(menu, title, icon, editor, marker) {
        menu.addItem(item => {
            item.setTitle(title).setIcon(icon).onClick(() => this.toggleLinePrefix(editor, marker));
        });
    }

    // 更新：支援 Regex 的格式偵測
    detectExplicitFormat(text) {
        // 1. Scene Heading (Regex)
        // 支援: EXT. | INT. | 1. EXT. | 01. INT.
        if (SCENE_REGEX.test(text)) {
            // 如果開頭有編號 '1. '，我們不需要做什麼，因為這裡是只負責樣式
            return { cssClass: CSS_CLASSES.SCENE, removePrefix: false, markerLength: 0, typeKey: 'SCENE' };
        }

        // 2. Transition (Regex)
        // Uppercase ending in TO:, or specific keywords like FADE IN/OUT
        if (TRANSITION_REGEX.test(text)) {
            return { cssClass: CSS_CLASSES.TRANSITION, removePrefix: false, markerLength: 0, typeKey: 'TRANSITION' };
        }

        // 3. Parenthetical (Regex) - Priority higher than Character fallback
        if (PARENTHETICAL_REGEX.test(text)) {
            return { cssClass: CSS_CLASSES.PARENTHETICAL, removePrefix: false, markerLength: 0, typeKey: 'PARENTHETICAL' };
        }

        if (text.startsWith(SCRIPT_MARKERS.CHARACTER))
            return { cssClass: CSS_CLASSES.CHARACTER, removePrefix: true, markerLength: 1, typeKey: 'CHARACTER' };
        // if (text.startsWith(SCRIPT_MARKERS.PARENTHETICAL))
        //     return { cssClass: CSS_CLASSES.PARENTHETICAL, removePrefix: false, markerLength: 0, typeKey: 'PARENTHETICAL' };

        return null;
    }

    applyFormatToElement(p, format) {
        p.addClass(format.cssClass);
        if (format.removePrefix && format.markerLength > 0) {
            this.stripMarkerFromElement(p, format.markerLength);
        }
    }

    stripMarkerFromElement(element, length) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const firstTextNode = walker.nextNode();
        if (firstTextNode) {
            let text = firstTextNode.textContent;
            const removeCount = length; // 這裡簡化，因為沒有開頭空格了
            if (text.length >= removeCount) {
                // 有些情況（如 @）我們才移除
                // 對於 Scene，因為現在改成文字 EXT.，我們不移除它
                firstTextNode.textContent = text.substring(removeCount);
            }
        }
    }

    // Command: 場次重新編號
    renumberScenes(editor) {
        const lineCount = editor.lineCount();
        let sceneCounter = 0;

        // 為了效能，我們一次處理變更 (但 CodeMirror 5 interface 只能逐行 setLine 或 replaceRange)
        // 我們逐行掃描並替換

        for (let i = 0; i < lineCount; i++) {
            const line = editor.getLine(i);
            const trimmed = line.trim();

            // 檢查是否符合 Scene 格式 (不管有無編號)
            const match = trimmed.match(SCENE_REGEX);
            if (match) {
                // match[1] 是舊編號 (可能 undefined)，match[2] 是關鍵字 (EXT.)
                // 我們只關心這是個場景
                sceneCounter++;
                const sceneNumStr = sceneCounter.toString().padStart(2, '0') + ". "; // 格式: "01. "

                // 重組字串：移除舊編號，加上新編號
                let contentWithoutNumber = trimmed;
                if (match[1]) {
                    // 移除舊編號部份
                    // trimStart 防止 'EXT.' 之前多餘空白
                    contentWithoutNumber = trimmed.replace(/^\d+[\.\s]\s*/, '');
                }

                // 確保關鍵字前沒有多餘空白
                contentWithoutNumber = contentWithoutNumber.trim();

                const newLine = sceneNumStr + contentWithoutNumber;

                if (newLine !== line) {
                    editor.setLine(i, newLine);
                }
            }
        }
    }

    // 輔助：單純切換前綴符號 (@, (, 等)
    toggleLinePrefix(editor, prefix) {
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);
        let newLineContent = lineContent;
        let hasMarker = false;

        for (const marker of Object.values(SCRIPT_MARKERS)) {
            if (lineContent.trim().startsWith(marker)) {
                const matchIndex = lineContent.indexOf(marker);
                const before = lineContent.substring(0, matchIndex);
                const after = lineContent.substring(matchIndex + marker.length);
                if (marker === prefix) {
                    newLineContent = before + after;
                    hasMarker = true;
                } else {
                    newLineContent = before + prefix + after;
                    hasMarker = true;
                }
                break;
            }
        }
        if (!hasMarker) newLineContent = prefix + lineContent;
        editor.setLine(cursor.line, newLineContent);
    }

    // Helper: Insert text (replaces line content or prepends? For transitions, usually purely the content)
    insertText(editor, text, replaceLine = false) {
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);
        if (replaceLine) {
            editor.setLine(cursor.line, text);
        } else {
            // For Scene Heading prefixes, prepend
            editor.setLine(cursor.line, text + lineContent);
        }
    }

    clearLinePrefix(editor) {
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);
        let newLineContent = lineContent;
        // 移除符號
        for (const marker of Object.values(SCRIPT_MARKERS)) {
            if (lineContent.trim().startsWith(marker)) {
                const matchIndex = lineContent.indexOf(marker);
                const before = lineContent.substring(0, matchIndex);
                const after = lineContent.substring(matchIndex + marker.length);
                newLineContent = before + after;
                editor.setLine(cursor.line, newLineContent);
                return;
            }
        }
        // 如果沒符號，檢查是否為場景編號，如果是，移除編號？
        // 暫時不處理，因為那是文字內容
    }
}

module.exports = ScripterPlugin;

