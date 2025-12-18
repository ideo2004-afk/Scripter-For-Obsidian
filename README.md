# Scripter

**Turn Obsidian into a fast, distraction-free screenplay writer.**  
**讓 Obsidian 變身為輕量、免費且專業的美式劇本寫作軟體。**

Scripter for Obsidian is a plugin designed to bring industry-standard screenplay formatting (Fountain-like) to Obsidian. It now features a powerful **Live Preview** mode, meaning you see the correct formatting while you write, without needing to switch modes.

## ✨ Philosophy (設計哲學)

- **Live Preview (所見即所得)**: Formatting is applied in real-time as you type in the editor.
- **Minimal Syntax**: Only **ONE** special character (`@`) is required.
- **Auto-Formatting**: Transitions, dialogues, and scene headings are detected automatically.
- **Zero Interference**: Formatting only applies to notes with `cssclasses: fountain` or `script`.

---

## 📝 Syntax Guide (語法指南)

### 1. Scene Headings (場景)
Start a line with standard screenplay prefixes. They will automatically bold.
*   **Syntax**: `INT.`, `EXT.`, `INT./EXT.`, `I/E.`
*   **Example**: 
    ```text
    INT. HOUSE - NIGHT
    ```

### 2. Characters (角色)
Prefix character names with `@`. They will be centered and capitalized. The `@` symbol automatically hides when you aren't editing the line.
*   **Syntax**: `@NAME`
*   **Example**:
    ```text
    @BATMAN
    ```

### 3. Dialogue (對白)
**Automatic.** Any line immediately following a Character, Parenthetical, or another Dialogue line is treated as Dialogue (indented).
*   **Example**:
    ```text
    @JOKER
    Why so serious?
    (smiling)
    Let's put a smile on that face.
    ```
    *(The lines following the character automatically become dialogue format)*

### 4. Parentheticals / Extensions (旁白/情緒/畫外音)
Use parentheses `()` `（）` or standard prefixes `VO:` / `OS:`. They will be centered and italicized.
*   **Syntax**: `(emotion)`, `（情緒）`, `VO: Text`, `OS: Text`
*   **Example**:
    ```text
    @BATMAN
    (struggling)
    Where is she?
    
    OS: It's too late.
    ```
    *(Note: `OS:` / `VO:` lines are treated as parentheticals and center aligned)*

### 5. Transitions (轉場)
Standard uppercase transitions ending in `TO:` or start/end keywords. They will be right-aligned.
*   **Syntax**: `CUT TO:`, `FADE IN:`, `FADE OUT.`, `DISSOLVE TO:`

---

## 🛠️ Features (功能特色)

### 🎬 Live Preview Editing
The editor now behaves like a dedicated screenwriting app:
- **Smart Indentation**: Dialogue is automatically indented.
- **Auto-Hiding Markers**: Technical symbols like `@` disappear to keep your view clean.
- **Header Centering**: `# Header 1` and `## Header 2` are automatically centered for professional script layout.

### 🔢 Scene Renumbering (自動場次編號)
Command: `Scripter: Renumber Scenes`
- Scans your entire document.
- Automatically adds or updates sequential numbers to all Scene Headings (e.g., `1. INT. ...`).

### 📄 Intelligent PDF Export (智慧 PDF 輸出)
The plugin includes a dedicated print engine (`@media print`) that ensures your PDF exports look like standard industry scripts with correct margins (A4/Letter optimized).

---

## 📦 Installation

To install this plugin, we recommend using **BRAT** for easy updates from GitHub, or installing manually.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [Latest Release](https://github.com/ideo2004-afk/Scripter-For-Obsidian/releases/latest).
2. Create a folder named `scripter-for-obsidian` in your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into that folder.
4. Reload Obsidian.

## 🎨 CSS Customization
The plugin uses `styles.css` for all formatting. You can tweak properties like margins or fonts if you need a specific look (e.g., Courier Prime).

## Support

If you find this plugin useful and would like to support its development, please consider buying me a coffee:

<a href="https://buymeacoffee.com/ideo2004c" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## License

MIT
