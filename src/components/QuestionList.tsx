import type { QuestionView } from '../../shared/protocol'

interface QuestionListProps {
  questions: QuestionView[]
  label?: string
}

export function QuestionList({ questions, label }: QuestionListProps) {
  return (
    <ul aria-label={label}>
      {questions.map((question) => <li key={question.id}>{question.text}</li>)}
    </ul>
  )
}
