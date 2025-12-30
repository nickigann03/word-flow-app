import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Simplified Regex for Bible References (e.g., "John 3:16", "Gen 1:1")
const BIBLE_REGEX = /\b((?:Genesis|Gen|Exodus|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|Ruth|1\s?Samuel|1\s?Sam|2\s?Samuel|2\s?Sam|1\s?Kings|1\s?Kgs|2\s?Kings|2\s?Kgs|1\s?Chronicles|1\s?Chron|2\s?Chronicles|2\s?Chron|Ezra|Nehemiah|Neh|Esther|Esth|Job|Psalms|Ps|Proverbs|Prov|Ecclesiastes|Eccl|Song\s?of\s?Solomon|Song|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Micah|Mic|Nahum|Nah|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mark|Luke|John|Acts|Romans|Rom|1\s?Corinthians|1\s?Cor|2\s?Corinthians|2\s?Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|1\s?Thessalonians|1\s?Thess|2\s?Thessalonians|2\s?Thess|1\s?Timothy|1\s?Tim|2\s?Timothy|2\s?Tim|Titus|Philemon|Philem|Hebrews|Heb|James|Jas|1\s?Peter|1\s?Pet|2\s?Peter|2\s?Pet|1\s?John|2\s?John|3\s?John|Jude|Revelation|Rev)\.?\s+\d+(?::\d+)?)\b/gi;

export interface BibleOptions {
    onHover?: (verse: string, event: MouseEvent) => void;
}

export const BibleReferenceExtension = Extension.create<BibleOptions>({
    name: 'bibleReference',

    addOptions() {
        return {
            onHover: () => { },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('bibleReference'),
                props: {
                    decorations: (state) => {
                        const decorations: Decoration[] = [];
                        const doc = state.doc;

                        doc.descendants((node, pos) => {
                            if (!node.isText) return;

                            const text = node.text || '';
                            const matches = Array.from(text.matchAll(BIBLE_REGEX));

                            matches.forEach((match) => {
                                const from = pos + match.index!;
                                const to = from + match[0].length;

                                decorations.push(
                                    Decoration.inline(from, to, {
                                        class: 'bible-reference',
                                        'data-verse': match[0],
                                    })
                                );
                            });
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                    handleDOMEvents: {
                        mouseover: (view, event) => {
                            const target = event.target as HTMLElement;
                            if (target.classList.contains('bible-reference')) {
                                const verse = target.getAttribute('data-verse');
                                if (verse && this.options.onHover) {
                                    this.options.onHover(verse, event);
                                    return true;
                                }
                            }
                            return false;
                        },
                    },
                },
            }),
        ];
    },
});
