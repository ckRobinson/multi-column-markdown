/**
 * File: /src/live_preview/cm6_livePreivew_onClickFix.ts                       *
 * Created Date: Friday, March 24th 2023, 6:10 pm                              *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2023 Cameron Robinson                                         *
 */

/**
 * This module is mostly a bodged fix for the Live Preview scrolling issue created when
 * large / long content (such as MCM) is being rendered through a CM6 StateField.
 * The core problem this module aims to "fix" is Obsidian's redraw and memory
 * management which causes the viewport to snap to the bottom of the document
 * on user click interaction. 
 * 
 * This CM6 plugin make the editing experience with MCM more user fiendly by snapping 
 * the view back to the cursor after Obsidian has performed it's full LP redraw, and 
 * culled out unneeded elements from the LP view.
 * 
 * If the core problem is ever fixed by Obsidian, this module will become obsolete
 * and be removed.
 */

import { EditorSelection, Extension, RangeSetBuilder, SelectionRange, StateField, Transaction, TransactionSpec, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { containsEndTag, containsRegionStart } from "../utilities/textParser";
import { editorEditorField, editorLivePreviewField } from "obsidian";
import { MouseState, mouseState } from "src/utilities/interfaces";

const EDITOR_VIEW_GC_TIMEOUT_MS = 150000 // 2.5m in ms

abstract class EditorCallbackManager {
	protected _regainedFocus: boolean = true;
	public get regainedFocus(): boolean {
		return this._regainedFocus;
	}

	protected _lostFocus: boolean = true;
	public get lostFocus(): boolean {
		return this._lostFocus;
	}

	protected _hasFocus: boolean;
	public get hasFocus(): boolean {
		return this._hasFocus;
	}
	public set hasFocus(value: boolean) {

		if(value === true) {
			if(this._hasFocus === false) {
				this._regainedFocus = true;
			}
			else {
				this._regainedFocus = false;
			}
		}
		else {
			if(this._hasFocus === true) {
				this._lostFocus = true;
			}
			else {
				this._lostFocus = false;
			}
		}

		this._hasFocus = value;
	}
}

class EditorViewScrollStateManager extends EditorCallbackManager{

	private lastUseTimestamp: number = Date.now();

	// TODO: Find a way to not require the editor view??
	private _editorView: EditorView;
	public get editorView(): EditorView {
		return this._editorView;
	}

	private _lastDocState: Text;
	public get lastDocState(): Text {
		return this._lastDocState;
	}
	public set lastDocState(value: Text) {
		this._lastDocState = value;
	}

	// Currently unused. Keeping stored for easy access in future.
	private _docTitle: string
	public get docTitle(): string {
		return this._docTitle
	}
	public set docTitle(value: string) {

		let parsedDocTitle = attemptParseDocTitle(value)
		if(parsedDocTitle !== "") {

			this._docTitle = parsedDocTitle;
			return;
		}
		this._docTitle = value;
	}

	constructor(editorView: EditorView) {
		super();

		this._editorView = editorView;
		this.hasFocus = true;
	}

	public hasBeenAccessed() {
		this.lastUseTimestamp = Date.now();
	}

	get isReadyForGC(): boolean {

		if(this._editorView === null) {
			return true;
		}

		let delta = Date.now() - this.lastUseTimestamp;
		if( this._editorView.inView === false &&
		    this._editorView.hasFocus === false && 
			delta > EDITOR_VIEW_GC_TIMEOUT_MS) {

			return true;
		}

		return false;
	}
}

class EditorDelayCallback extends EditorCallbackManager {

	public callback: () => void
	private creationTimestamp: number = Date.now();

	get callbackShouldTimeout(): boolean {
	
		let currentTimeMS = Date.now();
	
		let delta = currentTimeMS - this.creationTimestamp
	
		let maxDeltaTimeMS = 200
		if(delta > maxDeltaTimeMS) {
			return true;
		}
		return false;
	}
}

const clickDelayCallbacks: Map<string, EditorDelayCallback> = new Map();
const openEditorViews: Map<EditorView, EditorViewScrollStateManager> = new Map();
let lastGCPass = Date.now();
let editorMouseState: MouseState = "up";

export const MultiColumnMarkdown_OnClickFix = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		return builder.finish();

		if( shouldRunGCOnEditorMap() ) {

			for(let [editorView, scrollStateManager] of openEditorViews) {

				if(scrollStateManager.isReadyForGC) {
					openEditorViews.delete(editorView);
				}
			}
		}

        if(transaction.state.field(editorLivePreviewField) === false) {
            return builder.finish();
        }

		if( isTransactionRangeSelection(transaction) === true ) {
			return builder.finish();
		}

        /**
         * When we have the while file we then get the entire doc text and check if it 
         * contains a MCM region so we know to break or not.
         */
        let docLength = transaction.state.doc.length
        let docText = transaction.state.doc.sliceString(0, docLength);
        if (containsRegionStart(docText) === false) {
            return builder.finish();
        }

		if(mouseState === "down") {
			editorMouseState = mouseState;
		}

		const editorView = transaction.state.field(editorEditorField);
		
		let scrollStateManager: EditorViewScrollStateManager = getScrollStateManager(editorView, transaction);
		scrollStateManager.lastDocState = transaction.newDoc
		scrollStateManager.docTitle = editorView.dom.ownerDocument.title;

		if(editorView.hasFocus === true) {
			scrollStateManager.hasFocus = true;
		}

		let cursorLocation: SelectionRange = getMainCursorLocation(transaction);
		if(cursorLocation !== null) {
			let textAboveCursor = docText.slice(0, cursorLocation.from);

			let endTagAboveCursor = containsEndTag(textAboveCursor);
			if(endTagAboveCursor === false) {
				return builder.finish();
			}
		}

		if( transactionIsValidMouseDownEvent(transaction, cursorLocation) ) {
			
			handleMouseDownEvent(transaction, editorView, cursorLocation);
		}
		else if( transactionIsMouseUpEvent(transaction) ) {

			handleMouseUpEvent(transaction);
		}
		else if(editorHasBeenClickedAwayFrom(transaction, editorView, scrollStateManager)) {

			let refocusLocation = shouldRefocusOnCursorOrViewport(editorView, cursorLocation, docLength);
			refocusOnCursorArea(refocusLocation, editorView);
			scrollStateManager.hasFocus = false;
		}
		// else if( editorHasBeenClickedBackInto(transaction, scrollStateManager, editorView) ){
		//  // TODO: Bug where clicking back into editor without selecting a new cursor location 
		//  // will cause editor to jump to top of doc. Do not have way to prevent this as of now.
		// 	console.log("Editor has been refocused with null cursor location.")
		// }
		else if( editorMouseState === "down" && mouseState === "up" &&
				 transaction.state.selection.ranges && 
				 transaction.state.selection.ranges.length > 0 ) {

			editorMouseState = mouseState;
			let refocusLocation = shouldRefocusOnCursorOrViewport(editorView, cursorLocation, docLength);
			refocusOnCursorArea(refocusLocation, editorView);
		}
		else {

			clearUnUsedEntries(transaction);
		}

        return builder.finish();
	},
	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

function editorHasBeenClickedBackInto(transaction: Transaction, scrollStateManager: EditorViewScrollStateManager, editorView: EditorView): boolean {

	if(transaction.isUserEvent("select.pointer") === false &&
	   scrollStateManager.hasFocus === false &&
	   scrollStateManager.regainedFocus === false && 
	   scrollStateManager.lostFocus === false && 
	   editorView.inView) {
		return true;
	}

	return false;
}

function getMainCursorLocation(transaction: Transaction): SelectionRange {

	let cursorLocation: SelectionRange = null;
	if (transaction.state.selection.ranges &&
		transaction.state.selection.ranges.length > 0) {

		cursorLocation = transaction.state.selection.ranges[0];
	}

	return cursorLocation;
}

function handleMouseDownEvent(transaction: Transaction, editorView: EditorView, cursorLocation: SelectionRange) {

	let x: TransactionSpec = {
		effects: EditorView.scrollIntoView(cursorLocation, {
			y: "center"
		})
	};

	async function delay() {
		await sleep(15);
		editorView.dispatch(x);
	}
	let delayCallbackData = new EditorDelayCallback();
	delayCallbackData.callback = delay;
	clickDelayCallbacks.set(transaction.state.sliceDoc(), delayCallbackData);

	if (isRangedSelection([cursorLocation]) === false ||
		delayCallbackData.regainedFocus === true) {
		delay();
	}
}

function transactionIsValidMouseDownEvent(transaction: Transaction, cursorLocation: SelectionRange) {
	return transaction.isUserEvent("select.pointer") &&
		cursorLocation !== null;
}

function transactionIsMouseUpEvent(transaction: Transaction): boolean {

	if( transaction.docChanged === false && 
	    clickDelayCallbacks.has(transaction.state.sliceDoc()) ) {

			editorMouseState = mouseState;
			return true;
	}
	return false;
}

function getScrollStateManager(editorView: EditorView, transaction: Transaction) {
	
	if (openEditorViews.has(editorView) === false) {

		let scrollStateManager: EditorViewScrollStateManager = new EditorViewScrollStateManager(editorView);
		openEditorViews.set(editorView, scrollStateManager);

		return scrollStateManager;
	}

	let scrollStateManager: EditorViewScrollStateManager = openEditorViews.get(editorView);
	if (transactionSwappedEditorFile(transaction, scrollStateManager)) {

		scrollStateManager = new EditorViewScrollStateManager(editorView);
		openEditorViews.set(editorView, scrollStateManager);
		return scrollStateManager;
	}

	scrollStateManager.hasBeenAccessed();	
	return scrollStateManager;
}

function handleMouseUpEvent(transaction: Transaction) {

	let delayCallbackData = clickDelayCallbacks.get(transaction.state.sliceDoc());
	delayCallbackData.callback();
	if (delayCallbackData.callbackShouldTimeout === true) {
		clickDelayCallbacks.delete(transaction.state.sliceDoc());
	}
}

function clearUnUsedEntries(transaction: Transaction) {

	for (let [key, value] of clickDelayCallbacks) {
		if (value.callbackShouldTimeout === true) {
			clickDelayCallbacks.delete(transaction.state.sliceDoc());
		}
	}
}

function shouldRefocusOnCursorOrViewport(editorView: EditorView, cursorLocation: SelectionRange, docLength: number): SelectionRange {

	const VIEWPORT_CURSOR_REFOCUS_RANGE = 300;

	let viewportRange = editorView.viewport;
	if(viewportRange.from + VIEWPORT_CURSOR_REFOCUS_RANGE <= cursorLocation.from && cursorLocation.from <= viewportRange.to - VIEWPORT_CURSOR_REFOCUS_RANGE) {
		return cursorLocation;
	}

	if(viewportRange.from === 0) {
		return EditorSelection.cursor(0);
	}

	if(viewportRange.to >= docLength) {
		return EditorSelection.cursor(docLength);
	}

	let location = viewportRange.from + Math.floor((viewportRange.to - viewportRange.from) / 2);
	return EditorSelection.cursor(location)
}

function refocusOnCursorArea(cursorLocation: SelectionRange, editorView: EditorView) {

	let x: TransactionSpec = {
		effects: EditorView.scrollIntoView(cursorLocation, {
			y: "center"
		})
	}

	async function delay() {
		await sleep(100);
		editorView.dispatch(x)
	}
	delay()
}

function editorHasBeenClickedAwayFrom(transaction: Transaction, editorView: EditorView, scrollStateManager: EditorViewScrollStateManager): boolean {

	if( transaction.docChanged === false && 
		editorView.hasFocus    === false && 
		editorView.inView      === true  &&
		scrollStateManager.hasFocus  === true  &&
		scrollStateManager.lostFocus === true    ) {
		return true;
	}
	return false;
}

function isRangedSelection(cursorLocations: SelectionRange[]) {

	for(let range of cursorLocations) {
		if(range.to - range.from > 1) {
			return true;
		}
	}
	return false;
}

function isTransactionRangeSelection(transaction: Transaction): boolean {

	if(transaction.isUserEvent("select.pointer") && 
	   transaction.state.selection.ranges && 
	   transaction.state.selection.ranges.length > 0 &&
	   isRangedSelection(transaction.state.selection.ranges.slice())) {

		return true;
	}
	return false;
}

function transactionSwappedEditorFile(transaction: Transaction, scrollStateManager: EditorViewScrollStateManager): boolean {

	// If on this transaction there are multiple selection ranges we know
	// the user can not have swapped to a new file this transaction.
	if(transaction.state.selection.ranges.length !== 1) {
		return false;
	}

	// On new document load the cursor is placed at the beginning of the file.
	// If cursor is not at this location we know it isnt document load.
	if(transaction.state.selection.ranges[0].from !== 0 &&
	   transaction.state.selection.ranges[0].to   !== 0) {
	   return false;
	}

	// Make sure transaction is not also a user event. At this point should we be fairly
	// certain that this is a document load?
	if(transaction.isUserEvent("input")  || 
	   transaction.isUserEvent("delete") ||
	   transaction.isUserEvent("move")   || 
	   transaction.isUserEvent("select") ||
	   transaction.isUserEvent("undo")   ||
	   transaction.isUserEvent("redo")) {
		return false;
	}

	if(scrollStateManager.lastDocState === transaction.newDoc) {
		return false;
	}

	return true;
}

function shouldRunGCOnEditorMap(): boolean {
	
	const GC_DELTA_TIMER = 30000 // 30s

	let delta = Date.now() - lastGCPass;
	if(delta > GC_DELTA_TIMER) {

		lastGCPass = Date.now();
		return true;
	}
	return false;
}

function attemptParseDocTitle(value: string) {

	for(let i = 0; i < 2; i++) {

		let result = /(.*) - .*/.exec(value)
		if(result !== null && result.length > 1) {
			value = result[1];
		}
		else {
			return ""
		}
	}

	return value;
}