'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface QuestionActionResult {
  ok: boolean;
  error?: string;
}

export async function askQuestionAction(productSlug: string, formData: FormData): Promise<QuestionActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to ask a question.' };
  }

  try {
    await apiClient.post(
      '/v1/questions',
      { productId: formData.get('productId'), question: formData.get('question') },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/product/${productSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit your question' };
  }
}

export async function answerQuestionAction(
  productSlug: string,
  questionId: string,
  formData: FormData,
): Promise<QuestionActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to answer.' };
  }

  try {
    await apiClient.post(
      `/v1/questions/${questionId}/answers`,
      { answer: formData.get('answer') },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/product/${productSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit your answer' };
  }
}
