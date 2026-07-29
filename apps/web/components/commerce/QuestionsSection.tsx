import { apiClient } from '@/lib/api-client';
import { AskQuestionForm } from './AskQuestionForm';
import { AnswerQuestionForm } from './AnswerQuestionForm';

interface AnswerItem {
  id: string;
  answer: string;
  isFromStaff: boolean;
  createdAt: string;
}

interface QuestionItem {
  id: string;
  question: string;
  createdAt: string;
  answers: AnswerItem[];
}

interface QuestionsResult {
  items: QuestionItem[];
  total: number;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  productId: string;
  productSlug: string;
  isSignedIn: boolean;
}

export async function QuestionsSection({ productId, productSlug, isSignedIn }: Props) {
  const questions = await apiClient.get<QuestionsResult>(`/v1/questions?productId=${productId}&pageSize=20`);

  return (
    <div className="mt-10">
      <h2 className="text-base font-semibold mb-5">Questions & Answers</h2>

      {questions.items.length === 0 ? (
        <p className="text-sm text-steel">No questions yet — be the first to ask.</p>
      ) : (
        <ul className="space-y-5">
          {questions.items.map((q) => (
            <li key={q.id} className="border-b border-black/5 pb-5">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono text-[10.5px] uppercase tracking-wide text-steel">Q</span>
                <p className="text-sm font-semibold">{q.question}</p>
              </div>
              <p className="font-mono text-[10.5px] text-steel mb-2">{dateFormatter.format(new Date(q.createdAt))}</p>

              {q.answers.length > 0 && (
                <ul className="space-y-2 ml-4">
                  {q.answers.map((a) => (
                    <li key={a.id}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10.5px] uppercase tracking-wide text-hydra">A</span>
                        <p className="text-sm text-[#4A5157]">{a.answer}</p>
                        {a.isFromStaff && (
                          <span className="font-mono text-[9px] uppercase tracking-wide bg-[#EAF3F8] text-hydra px-1.5 py-0.5 rounded-sm">
                            Staff
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {isSignedIn && (
                <div className="ml-4">
                  <AnswerQuestionForm productSlug={productSlug} questionId={q.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isSignedIn && <AskQuestionForm productId={productId} productSlug={productSlug} />}
    </div>
  );
}
