interface Props {
  content: string
  onChange: (c: string) => void
}

export default function PlainTextEditor({ content, onChange }: Props): JSX.Element {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: "'Cascadia Code', Consolas, monospace",
        fontSize: 13,
        resize: 'none',
        border: 'none',
        borderRadius: 0,
        background: 'var(--bg-0)'
      }}
    />
  )
}
