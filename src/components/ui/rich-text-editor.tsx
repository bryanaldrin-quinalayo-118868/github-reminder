import { useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontSize from '@/components/ui/font-size-extension'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '18px' },
  { label: 'X-Large', value: '24px' },
] as const;

type RichTextEditorProps = {
  defaultValue?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  className?: string;
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RichTextEditor({
  defaultValue = '',
  placeholder,
  onChange,
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'max-h-48 rounded' },
      }),
      TextStyle,
      FontSize,
      Placeholder.configure({
        placeholder: placeholder ?? 'Type a message…',
      }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[3.5rem] max-h-40 overflow-y-auto text-sm outline-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_img]:my-1',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return false;

        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;

        for (const file of images) {
          fileToBase64(file).then((src) => {
            const { tr } = view.state;
            const node = view.state.schema.nodes.image.create({ src });
            view.dispatch(tr.insert(pos, node));
          });
        }
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageItems = Array.from(items).filter((i) => i.type.startsWith('image/'));
        if (imageItems.length === 0) return false;

        event.preventDefault();
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) continue;
          fileToBase64(file).then((src) => {
            const { tr } = view.state;
            const node = view.state.schema.nodes.image.create({ src });
            view.dispatch(tr.insert(view.state.selection.from, node));
          });
        }
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
    onTransaction: () => {
      setTick((t) => t + 1)
    },
  })

  if (!editor) return null

  function handleSetLink() {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', previousUrl ?? 'https://')

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !editor) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const src = await fileToBase64(file);
      editor.chain().focus().setImage({ src }).run();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFontSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!editor) return;
    const value = e.target.value;
    if (value === '') {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(value).run();
    }
  }

  const currentFontSize = (editor.getAttributes('textStyle').fontSize as string) || '';

  return (
    <div
      className={cn(
        'rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      {/* toolbar */}
      <div className='flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1'>
        {/* font size */}
        <select
          value={currentFontSize}
          onChange={handleFontSizeChange}
          title='Font size'
          className='h-7 rounded border-none bg-transparent px-1 text-xs outline-none hover:bg-accent'
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className='mx-1 h-4 w-px bg-border' />

        <ToolbarButton
          title='Bold'
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className='h-3.5 w-3.5' />
        </ToolbarButton>

        <ToolbarButton
          title='Italic'
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className='h-3.5 w-3.5' />
        </ToolbarButton>

        <ToolbarButton
          title='Strikethrough'
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className='h-3.5 w-3.5' />
        </ToolbarButton>

        <div className='mx-1 h-4 w-px bg-border' />

        <ToolbarButton
          title='Bullet list'
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className='h-3.5 w-3.5' />
        </ToolbarButton>

        <ToolbarButton
          title='Numbered list'
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className='h-3.5 w-3.5' />
        </ToolbarButton>

        <div className='mx-1 h-4 w-px bg-border' />

        {editor.isActive('link') ? (
          <ToolbarButton
            title='Remove link'
            active
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Unlink className='h-3.5 w-3.5' />
          </ToolbarButton>
        ) : (
          <ToolbarButton title='Add link' onClick={handleSetLink}>
            <LinkIcon className='h-3.5 w-3.5' />
          </ToolbarButton>
        )}

        <ToolbarButton
          title='Upload image'
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className='h-3.5 w-3.5' />
        </ToolbarButton>
      </div>

      {/* hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={handleImageUpload}
      />

      {/* editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
