import { Mark, mergeAttributes, Extension, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

export interface CommentOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        comment: {
            setComment: (comment: string) => ReturnType;
            unsetComment: () => ReturnType;
        };
        circle: {
            toggleCircle: () => ReturnType;
        };
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
        toggleBlock: {
            setToggleBlock: () => ReturnType;
        };
        callout: {
            setCallout: (type: 'info' | 'warning' | 'success' | 'error') => ReturnType;
        };
        details: {
            toggleDetails: () => ReturnType;
        };
    }
}

// Font Size Extension
export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (fontSize) =>
                    ({ chain }) => {
                        return chain()
                            .setMark('textStyle', { fontSize })
                            .run();
                    },
            unsetFontSize:
                () =>
                    ({ chain }) => {
                        return chain()
                            .setMark('textStyle', { fontSize: null })
                            .removeEmptyTextStyle()
                            .run();
                    },
        };
    },
});

// Comment Mark
export const CommentMark = Mark.create<CommentOptions>({
    name: 'comment',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            text: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-comment'),
                renderHTML: (attributes) => ({
                    'data-comment': attributes.text,
                    title: attributes.text,
                }),
            },
            timestamp: {
                default: null,
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-comment]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'comment-mark' }), 0];
    },

    addCommands() {
        return {
            setComment:
                (text) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, { text, timestamp: Date.now() });
                    },
            unsetComment:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
        };
    },
});

// Circle Mark
export const CircleMark = Mark.create({
    name: 'circle',
    addOptions() { return { HTMLAttributes: {} } },
    parseHTML() { return [{ tag: 'span.circle-mark' }] },
    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'circle-mark' }), 0];
    },
    addCommands() {
        return {
            toggleCircle: () => ({ commands }) => commands.toggleMark(this.name),
        }
    }
});

// Toggle Block (Collapsible Sections)
export const ToggleBlock = Node.create({
    name: 'toggleBlock',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            open: {
                default: true,
                parseHTML: element => element.hasAttribute('open'),
                renderHTML: attributes => {
                    return attributes.open ? { open: 'true' } : {};
                },
            },
            title: {
                default: 'Toggle',
                parseHTML: element => element.getAttribute('data-title') || 'Toggle',
                renderHTML: attributes => ({
                    'data-title': attributes.title,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'details.toggle-block',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['details', mergeAttributes(HTMLAttributes, { class: 'toggle-block' }),
            ['summary', HTMLAttributes['data-title'] || 'Toggle'],
            ['div', { class: 'toggle-content' }, 0]
        ];
    },

    addCommands() {
        return {
            setToggleBlock:
                () =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: 'toggleBlock',
                            attrs: { title: 'Toggle block', open: true },
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [{ type: 'text', text: 'Toggle content...' }],
                                },
                            ],
                        });
                    },
        };
    },
});

// Callout Block (Info, Warning, Success, Error)
export const Callout = Node.create({
    name: 'callout',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: element => element.getAttribute('data-callout-type') || 'info',
                renderHTML: attributes => ({
                    'data-callout-type': attributes.type,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div.callout',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const type = HTMLAttributes['data-callout-type'] || 'info';
        return ['div', mergeAttributes(HTMLAttributes, {
            class: `callout callout-${type}`,
            'data-callout-type': type
        }), 0];
    },

    addCommands() {
        return {
            setCallout:
                (type: 'info' | 'warning' | 'success' | 'error' = 'info') =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: 'callout',
                            attrs: { type },
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [{ type: 'text', text: 'Callout text...' }],
                                },
                            ],
                        });
                    },
        };
    },
});

// Indent Extension - allows Tab/Shift+Tab for indentation
export const Indent = Extension.create({
    name: 'indent',

    addOptions() {
        return {
            types: ['listItem', 'paragraph', 'heading'],
            indentRange: 24,
            minIndent: 0,
            maxIndent: 24 * 10,
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    indent: {
                        default: 0,
                        renderHTML: (attributes) => {
                            if (!attributes.indent) {
                                return {};
                            }
                            return {
                                style: `margin-left: ${attributes.indent}px`,
                            };
                        },
                        parseHTML: (element) => {
                            const indent = element.style.marginLeft;
                            return indent ? parseInt(indent, 10) : 0;
                        },
                    },
                },
            },
        ];
    },

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                const { editor } = this;
                const { state, view } = editor;
                const { selection } = state;
                const { from, to } = selection;

                // If we're in a list, let the default list behavior handle it
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                    // Sink list item
                    return editor.commands.sinkListItem('listItem');
                }

                // Otherwise, add indent to the current block
                const currentIndent = editor.getAttributes('paragraph').indent || 0;
                const newIndent = Math.min(currentIndent + this.options.indentRange, this.options.maxIndent);

                return editor.chain().focus().updateAttributes('paragraph', { indent: newIndent }).run();
            },
            'Shift-Tab': () => {
                const { editor } = this;

                // If we're in a list, let the default list behavior handle it
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                    return editor.commands.liftListItem('listItem');
                }

                // Otherwise, reduce indent
                const currentIndent = editor.getAttributes('paragraph').indent || 0;
                const newIndent = Math.max(currentIndent - this.options.indentRange, this.options.minIndent);

                return editor.chain().focus().updateAttributes('paragraph', { indent: newIndent }).run();
            },
        };
    },
});

// Details/Summary Extension (HTML5 native collapsible)
export const Details = Node.create({
    name: 'details',

    group: 'block',

    content: 'detailsSummary detailsContent',

    defining: true,

    addAttributes() {
        return {
            open: {
                default: false,
                parseHTML: element => element.hasAttribute('open'),
                renderHTML: attributes => {
                    return attributes.open ? { open: '' } : {};
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'details' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['details', mergeAttributes(HTMLAttributes, { class: 'notion-toggle' }), 0];
    },

    addCommands() {
        return {
            toggleDetails: () => ({ commands }) => {
                return commands.insertContent({
                    type: 'details',
                    content: [
                        {
                            type: 'detailsSummary',
                            content: [{ type: 'text', text: 'Click to expand' }],
                        },
                        {
                            type: 'detailsContent',
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [{ type: 'text', text: 'Hidden content here...' }],
                                },
                            ],
                        },
                    ],
                });
            },
        };
    },
});

export const DetailsSummary = Node.create({
    name: 'detailsSummary',
    group: 'block',
    content: 'inline*',
    defining: true,
    parseHTML() { return [{ tag: 'summary' }]; },
    renderHTML({ HTMLAttributes }) {
        return ['summary', mergeAttributes(HTMLAttributes, { class: 'toggle-summary' }), 0];
    },
});

export const DetailsContent = Node.create({
    name: 'detailsContent',
    group: 'block',
    content: 'block+',
    defining: true,
    parseHTML() { return [{ tag: 'div.details-content' }]; },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'details-content' }), 0];
    },
});
