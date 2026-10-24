'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from './actions';
import type { SignInState } from './sign-in-state';

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, { error: false, attempt: 0 });
  return <SignInFormView state={state} formAction={formAction} pending={pending} />;
}

// The form without the action wiring, so it can be rendered in tests.
export function SignInFormView({
  state,
  formAction,
  pending,
}: {
  state: SignInState;
  formAction: (form: FormData) => void;
  pending: boolean;
}) {
  const t = useTranslations('enter');
  return (
    <form action={formAction} className="flex flex-col">
      <Label htmlFor="passphrase" className="mb-1.5">
        {t('label')}
      </Label>
      <Input
        // A new key after each attempt empties the field.
        key={state.attempt}
        id="passphrase"
        name="passphrase"
        type="password"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        autoFocus={state.error}
        aria-invalid={state.error || undefined}
        aria-describedby={state.error ? 'passphrase-error' : undefined}
      />
      {state.error && (
        <p id="passphrase-error" className="mt-1.5 text-[13px] text-error">
          {t('wrong')}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-3">
        {t('submit')}
      </Button>
    </form>
  );
}
