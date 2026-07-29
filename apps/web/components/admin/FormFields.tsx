import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const FIELD_CLASSES = 'w-full border border-black/15 rounded-sm px-3 py-2 text-sm outline-none focus:border-hydra';
const LABEL_CLASSES = 'block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5';

interface WrapperProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

function FieldWrapper({ label, htmlFor, hint, children }: WrapperProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className={LABEL_CLASSES}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-steel mt-1">{hint}</p>}
    </div>
  );
}

type TextFieldProps = { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={rest.id ?? rest.name ?? ''} hint={hint}>
      <input className={FIELD_CLASSES} {...rest} />
    </FieldWrapper>
  );
}

type TextAreaFieldProps = { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ label, hint, ...rest }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={rest.id ?? rest.name ?? ''} hint={hint}>
      <textarea className={`${FIELD_CLASSES} min-h-[100px]`} {...rest} />
    </FieldWrapper>
  );
}

type SelectFieldProps = { label: string; hint?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, hint, children, ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={rest.id ?? rest.name ?? ''} hint={hint}>
      <select className={FIELD_CLASSES} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}
