/**
 * Click-to-edit for live preview regions (fork addition).
 *
 * The region is a CM6 replace-decoration widget. WidgetType.ignoreEvent()
 * defaults to true, so CodeMirror drops every mouse event inside it and the
 * cursor never moves into the region. This handler maps a click on a rendered
 * block back to its source line and moves the cursor there, which makes the
 * state field drop the widget and show the raw markdown.
 */

import { EditorView } from "@codemirror/view";
import { findEndTag } from "../utilities/textParser";

const BOUND_FLAG = "mcmClickToEditBound";

// Clicks on these keep their normal rendered behaviour.
const INTERACTIVE_SELECTOR = [
    "a", "input", "button", "select", "textarea", "label",
    ".internal-link", ".external-link", ".tag",
    ".task-list-item-checkbox", ".internal-embed", ".image-embed",
    ".media-embed", ".file-embed", ".mcm-column-error-region-wrapper",
    ".copy-code-button", ".collapse-indicator"
].join(", ");

const BLOCK_SELECTOR = "li, p, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, hr";

const COL_BREAK_REGEX = /^\s*(?:(?:-{3}|={3})\s*(?:column-end|end-column|column-break|break-column)\s*(?:-{3}|={3})|\\?\\columnbreak|:{3,}\s*column-?break\s*:{3,})\s*$/;
const SETTINGS_FENCE_REGEX = /^\s*```\s*(?:column-settings|settings|multi-column-settings|column-md|col-md|multi-column-start)\b/i;
const START_TAG_REGEX = /^\s*(?:-{3}|={3})\s*(?:start-multi-column|multi-column-start)\b/;

export function attachClickToEdit(el: HTMLElement, fallbackView: EditorView) {

    if ((el as any)[BOUND_FLAG]) {
        return;
    }
    (el as any)[BOUND_FLAG] = true;

    el.addEventListener("click", (event: MouseEvent) => {
        try {
            handleClick(el, fallbackView, event);
        }
        catch (e) {
            console.warn("multi-column-markdown click-to-edit:", e);
        }
    });
}

function handleClick(el: HTMLElement, fallbackView: EditorView, event: MouseEvent) {

    if (event.button !== 0 || event.defaultPrevented) {
        return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    if (target.closest(INTERACTIVE_SELECTOR)) {
        return;
    }

    // Let the user select / copy rendered text.
    const domSel = window.getSelection();
    if (domSel && domSel.isCollapsed === false && el.contains(domSel.anchorNode)) {
        return;
    }

    const view = findView(el) ?? fallbackView;
    if (!view || !view.dom.contains(el)) {
        return;
    }

    let regionFrom: number;
    try {
        regionFrom = view.posAtDOM(el);
    }
    catch {
        return;
    }

    const doc = view.state.doc;
    const afterStart = doc.sliceString(regionFrom);
    const endTag = findEndTag(afterStart);
    const regionTo = endTag.found ? regionFrom + endTag.startPosition : Math.min(doc.length, regionFrom + afterStart.length);

    const pos = mapClickToPosition(el, target, view, regionFrom, regionTo) ?? firstContentLineEnd(view, regionFrom, regionTo) ?? regionFrom;

    event.preventDefault();
    event.stopPropagation();
    view.focus();
    view.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
        userEvent: "select.pointer"
    });
}

function findView(el: HTMLElement): EditorView | null {
    const anyView = EditorView as any;
    if (typeof anyView.findFromDOM === "function") {
        const editorDom = el.closest(".cm-editor") as HTMLElement;
        if (editorDom) {
            return anyView.findFromDOM(editorDom);
        }
    }
    return null;
}

interface SourceLine {
    pos: number;      // doc position of line end (cursor target)
    norm: string;     // normalised text
    blank: boolean;
}

/**
 * Split the region source into columns of lines, skipping the start tag and
 * settings block.
 */
function getSourceColumns(view: EditorView, from: number, to: number): SourceLine[][] {

    const doc = view.state.doc;
    const columns: SourceLine[][] = [[]];
    let inSettings = false;

    const firstLine = doc.lineAt(from).number;
    const lastLine = doc.lineAt(Math.max(from, to - 1)).number;

    for (let n = firstLine; n <= lastLine; n++) {
        const line = doc.line(n);
        const text = line.text;

        if (inSettings) {
            if (/^\s*```\s*$/.test(text)) {
                inSettings = false;
            }
            continue;
        }
        if (n === firstLine && START_TAG_REGEX.test(text)) {
            continue;
        }
        if (SETTINGS_FENCE_REGEX.test(text)) {
            inSettings = true;
            continue;
        }
        if (COL_BREAK_REGEX.test(text)) {
            columns.push([]);
            continue;
        }

        columns[columns.length - 1].push({
            pos: line.to,
            norm: normaliseSource(text),
            blank: text.trim() === ""
        });
    }
    return columns;
}

function mapClickToPosition(el: HTMLElement, target: Element, view: EditorView, from: number, to: number): number | null {

    const sourceColumns = getSourceColumns(view, from, to);

    const block = target.closest(BLOCK_SELECTOR) as HTMLElement;
    const columnDivs = Array.from(el.querySelectorAll(".mcm-column-div")) as HTMLElement[];
    const columnDiv = target.closest(".mcm-column-div") as HTMLElement;
    const colIndex = columnDiv ? columnDivs.indexOf(columnDiv) : -1;

    // Columns line up 1:1 with the source when explicit breaks are used.
    // Otherwise (auto layout) search the whole region.
    const perColumn = colIndex >= 0 && sourceColumns.length === columnDivs.length;
    const searchLines = perColumn ? sourceColumns[colIndex] : sourceColumns.flat();
    const searchRoot: HTMLElement = perColumn ? columnDiv : el;

    if (!block || !el.contains(block)) {
        // Clicked column padding / whitespace: go to the column's first line.
        const firstLine = searchLines.find(l => !l.blank);
        return firstLine ? firstLine.pos : null;
    }

    const needle = blockText(block);

    // Occurrence index of this block among same-text blocks before it.
    const sameText = (Array.from(searchRoot.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[])
        .filter(b => !isClonedCopy(b) && blockText(b) === needle);
    let occurrence = sameText.indexOf(block);
    if (occurrence < 0) {
        occurrence = 0;
    }

    const exact = searchLines.filter(l => !l.blank && l.norm === needle);
    if (exact.length > 0) {
        const hit = exact[Math.min(occurrence, exact.length - 1)];
        return offsetBySoftBreaks(view, hit.pos, block, target);
    }

    if (needle.length > 0) {
        const loose = searchLines.filter(l => !l.blank && l.norm.length > 0 &&
            (l.norm.includes(needle) || needle.includes(l.norm)));
        if (loose.length > 0) {
            return loose[Math.min(occurrence, loose.length - 1)].pos;
        }
    }

    const firstLine = searchLines.find(l => !l.blank);
    return firstLine ? firstLine.pos : null;
}

/** In a multi-line paragraph, move down one source line per <br> before the click. */
function offsetBySoftBreaks(view: EditorView, linePos: number, block: HTMLElement, target: Element): number {
    if (block.tagName !== "P") {
        return linePos;
    }
    const brs = Array.from(block.querySelectorAll("br"))
        .filter(br => (br.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).length;
    const doc = view.state.doc;
    const lineNo = Math.min(doc.lineAt(linePos).number + brs, doc.lines);
    return doc.line(lineNo).to;
}

function isClonedCopy(el: HTMLElement): boolean {
    return el.closest(".mcm-cloned-column-element") !== null;
}

/** Text of the block's first line, without nested lists. */
function blockText(block: HTMLElement): string {
    const clone = block.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("ul, ol, .list-collapse-indicator, .collapse-indicator").forEach(n => n.remove());
    clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
    const text = (clone.textContent ?? "").split("\n").map(s => s.trim()).find(s => s.length > 0) ?? "";
    return normaliseRendered(text);
}

function normaliseRendered(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function normaliseSource(text: string): string {
    let t = text;
    t = t.replace(/<!--.*?-->/g, "");
    t = t.replace(/^\s*(?:>\s*)+/, "");                       // blockquote
    t = t.replace(/^\s*#{1,6}\s+/, "");                       // heading
    t = t.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "");            // list marker
    t = t.replace(/^\s*(?:[-*+]|\d+[.)])\s*$/, "");           // empty list item
    t = t.replace(/^\[.\]\s*/, "");                           // task box
    t = t.replace(/!?\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2");    // [[a|b]]
    t = t.replace(/!?\[\[([^\]]*)\]\]/g, (_m, a: string) => a.split("#").pop()); // [[a]]
    t = t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");          // [t](u)
    t = t.replace(/(\*\*|__|~~|==)/g, "");
    t = t.replace(/(^|[^\w])[*_](?=\S)/g, "$1").replace(/(\S)[*_](?=[^\w]|$)/g, "$1");
    t = t.replace(/`/g, "");
    return t.replace(/\s+/g, " ").trim();
}

function firstContentLineEnd(view: EditorView, from: number, to: number): number | null {
    const firstLine = getSourceColumns(view, from, to).flat().find(l => !l.blank);
    return firstLine ? firstLine.pos : null;
}
