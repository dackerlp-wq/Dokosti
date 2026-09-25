"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/(shop)/jak-zacit-s-barfem/actions";
import { Button } from "@/components/ui/button";

export function InquiryForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, null);
  if (state?.ok) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <p className="font-display text-[20px] font-semibold">Dotaz je u nás.</p>
        <p className="mt-1 text-sm text-muted">Ozveme se zpravidla do jednoho pracovního dne.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-5 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Jméno" name="name" required autoComplete="name" />
      <Field label="E-mail" name="email" type="email" required autoComplete="email" />
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Pes, nebo kočka?</span>
        <select name="animal" defaultValue="pes">
          <option value="pes">Pes</option>
          <option value="kocka">Kočka</option>
          <option value="oba">Pes i kočka</option>
        </select>
      </label>
      <Field label="Věk a hmotnost" name="age_weight" placeholder="např. 3 roky, 22 kg" />
      <label className="block sm:col-span-2">
        <span className="label mb-1 block text-[11px] text-muted">Váš dotaz</span>
        <textarea name="question" rows={4} required minLength={10} placeholder="Co vašeho psa nebo kočku trápí, s čím pomoct…" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Odesílám…" : "Odeslat dotaz"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">{label}</span>
      <input name={name} {...rest} />
    </label>
  );
}
