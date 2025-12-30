import { Mark, mergeAttributes, Extension } from '@tiptap/core';

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
    }
}

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
