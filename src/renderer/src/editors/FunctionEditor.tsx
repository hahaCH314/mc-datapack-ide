import CodeMirror from '@uiw/react-codemirror'
import { githubDark } from '@uiw/codemirror-theme-github'
import { autocompletion } from '@codemirror/autocomplete'
import { mcfunctionLanguage } from '../lib/mcfunctionLang'
import { mcfunctionCompletionSource } from '../lib/commandCompletion'

interface Props {
  content: string
  onChange: (c: string) => void
}

export default function FunctionEditor({ content, onChange }: Props): JSX.Element {
  return (
    <CodeMirror
      value={content}
      height="100%"
      theme={githubDark}
      extensions={[
        mcfunctionLanguage,
        autocompletion({ override: [mcfunctionCompletionSource], activateOnTyping: true })
      ]}
      onChange={onChange}
      style={{ height: '100%', fontSize: 13.5 }}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
    />
  )
}
