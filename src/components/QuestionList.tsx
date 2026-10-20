import type { QuestionView } from '../../shared/protocol'
import { stickyNoteClasses } from './stickyNote'

interface QuestionListProps {
  questions: QuestionView[]
  label?: string
}

export function QuestionList({ questions, label }: QuestionListProps) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {questions.map((question, index) => (
        <li key={question.id} className={`${stickyNoteClasses(question.color, index)} px-4 py-3 text-sm leading-snug`}>
          {question.text}
        </li>
      ))}
    </ul>
  )
}
