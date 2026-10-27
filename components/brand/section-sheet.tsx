'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  applySection,
  type BusinessValues,
  type ContactValues,
  type FeelingValues,
  type FieldError,
  type LookValues,
  type PlaceValues,
  type SectionId,
  type SectionValues,
  sectionValues,
} from '@/lib/brand/edit';
import type { FieldKey } from '@/lib/brand/missing';
import { COLOUR_ROLES, LIMITS, type Profile } from '@/lib/brand/profile';
import { ChipsField } from './chips-field';
import { ListField } from './list-field';

// The form for one section of the brand panel, in a bottom sheet
// (docs/specs/brand/brand-panel, "Editing").

type Errors = Record<string, FieldError>;

function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  multiline = false,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  multiline?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  const props = {
    id,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea {...props} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          {...props}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

type FormProps<S extends SectionId> = {
  values: SectionValues[S];
  set: (values: SectionValues[S]) => void;
  error: (key: string) => string | undefined;
  profile: Profile;
};

function useLabels() {
  const panel = useTranslations('brand.panel');
  const edit = useTranslations('brand.edit');
  return {
    field: (key: string) => panel(`fields.${key}` as 'fields.name'),
    words: (count: number) => edit('wordsHint', { count }),
    items: (count: number) => edit('itemsHint', { count }),
    list: (key: string) => edit(`list.${key}` as 'list.remove'),
    item: (key: string) => edit(`item.${key}` as 'item.service'),
    role: (role: string) => panel(`roles.${role}` as 'roles.primary'),
    look: (key: string) => edit(`look.${key}` as 'look.removeLogo'),
  };
}

function BusinessForm({ values, set, error }: FormProps<'business'>) {
  const l = useLabels();
  const v = values as BusinessValues;
  return (
    <>
      <TextField
        label={l.field('name')}
        value={v.name}
        onChange={(name) => set({ ...v, name })}
        error={error('name')}
      />
      <TextField
        label={l.field('summary')}
        value={v.summary}
        multiline
        onChange={(summary) => set({ ...v, summary })}
        hint={l.words(LIMITS.summaryWords)}
        error={error('summary')}
      />
      <TextField
        label={l.field('category')}
        value={v.category}
        onChange={(category) => set({ ...v, category })}
        error={error('category')}
      />
      <ListField
        label={l.field('offerings')}
        hint={l.items(LIMITS.offerings)}
        error={error('offerings')}
        items={v.offerings}
        onChange={(offerings) => set({ ...v, offerings })}
        addLabel={l.list('addOffering')}
        newItem={() => ({ name: '', description: '', price: '', duration: '' })}
        renderItem={(o, i, update) => (
          <div className="flex flex-col gap-2">
            <TextField
              label={l.item('service')}
              value={o.name}
              onChange={(name) => update({ ...o, name })}
              error={error(`offerings.${i}.name`)}
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={l.item('price')}
                value={o.price}
                onChange={(price) => update({ ...o, price })}
              />
              <TextField
                label={l.item('duration')}
                value={o.duration}
                onChange={(duration) => update({ ...o, duration })}
              />
            </div>
            <TextField
              label={l.item('description')}
              value={o.description}
              onChange={(description) => update({ ...o, description })}
            />
          </div>
        )}
      />
      <ListField
        label={l.field('highlights')}
        hint={l.items(LIMITS.highlights)}
        error={error('highlights')}
        items={v.highlights}
        onChange={(highlights) => set({ ...v, highlights })}
        addLabel={l.list('addHighlight')}
        newItem={() => ({ value: '' })}
        renderItem={(h, i, update) => (
          <TextField
            label={l.item('claim')}
            value={h.value}
            onChange={(value) => update({ ...h, value })}
            error={error(`highlights.${i}`)}
          />
        )}
      />
    </>
  );
}

function PlaceForm({ values, set, error }: FormProps<'place'>) {
  const l = useLabels();
  const v = values as PlaceValues;
  return (
    <>
      {(['town', 'area', 'address', 'serviceArea', 'hours'] as const).map((key) => (
        <TextField
          key={key}
          label={l.field(key)}
          value={v[key]}
          onChange={(value) => set({ ...v, [key]: value })}
          error={error(key)}
        />
      ))}
    </>
  );
}

function ContactForm({ values, set, error }: FormProps<'contact'>) {
  const l = useLabels();
  const v = values as ContactValues;
  const kinds: Record<keyof ContactValues, { type: string; inputMode?: 'tel' | 'email' | 'url' }> =
    {
      whatsapp: { type: 'tel', inputMode: 'tel' },
      phone: { type: 'tel', inputMode: 'tel' },
      email: { type: 'email', inputMode: 'email' },
      instagram: { type: 'text' },
      bookingUrl: { type: 'url', inputMode: 'url' },
    };
  return (
    <>
      {(Object.keys(kinds) as (keyof ContactValues)[]).map((key) => (
        <TextField
          key={key}
          label={l.field(key)}
          value={v[key]}
          type={kinds[key].type}
          inputMode={kinds[key].inputMode}
          onChange={(value) => set({ ...v, [key]: value })}
          error={error(key)}
        />
      ))}
    </>
  );
}

const STYLE_PARTS = ['summary', 'palette', 'light', 'textures', 'mood'] as const;

function LookForm({ values, set, error, profile }: FormProps<'look'>) {
  const l = useLabels();
  const v = values as LookValues;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] text-ink-secondary">{l.field('logo')}</p>
        {v.keepLogo && profile.logoUrl ? (
          <div className="flex items-center justify-between gap-3">
            {/* biome-ignore lint/performance/noImgElement: hot-linked from the owner's site, not ours to optimise */}
            <img
              src={profile.logoUrl.value}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-12 max-w-32 object-contain"
            />
            <button
              type="button"
              onClick={() => set({ ...v, keepLogo: false })}
              className="min-h-11 text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {l.look('removeLogo')}
            </button>
          </div>
        ) : (
          <p className="text-[15px] text-ink-secondary">{l.look('noLogo')}</p>
        )}
      </div>
      <ListField
        label={l.field('colours')}
        hint={l.items(LIMITS.colours)}
        error={error('colours')}
        items={v.colours}
        onChange={(colours) => set({ ...v, colours })}
        addLabel={l.list('addColour')}
        newItem={() => ({ hex: '#888888', role: 'accent' })}
        renderItem={(c, i, update) => (
          <div className="flex items-end gap-2">
            <input
              type="color"
              aria-label={l.item('colour')}
              value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#888888'}
              onChange={(e) => update({ ...c, hex: e.target.value })}
              className="h-12 w-12 shrink-0 rounded-control border border-edge bg-field"
            />
            <div className="flex-1">
              <TextField
                label={l.item('hex')}
                value={c.hex}
                onChange={(hex) => update({ ...c, hex })}
                error={error(`colours.${i}.hex`)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <ColourRole value={c.role} onChange={(role) => update({ ...c, role })} />
            </div>
          </div>
        )}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-[13px] text-ink-secondary">{l.field('visualStyle')}</legend>
        {STYLE_PARTS.map((part) => (
          <TextField
            key={part}
            label={part === 'summary' ? l.field('visualStyle') : l.field(part)}
            value={v.style[part]}
            onChange={(value) => set({ ...v, style: { ...v.style, [part]: value } })}
            hint={part === 'summary' ? l.words(LIMITS.styleSummaryWords) : undefined}
            error={error(`style.${part}`)}
          />
        ))}
        {error('style') && <p className="text-xs text-error">{error('style')}</p>}
      </fieldset>
      {profile.photoUrls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-ink-secondary">{l.field('photos')}</p>
          <ul className="grid grid-cols-3 gap-2">
            {profile.photoUrls
              .filter((url) => v.photoUrls.includes(url))
              .map((url) => (
                <li key={url} className="flex flex-col items-center">
                  {/* biome-ignore lint/performance/noImgElement: hot-linked from the owner's site, not ours to optimise */}
                  <img
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full rounded-control object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set({ ...v, photoUrls: v.photoUrls.filter((u) => u !== url) })}
                    className="min-h-11 text-[13px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {l.look('removePhoto')}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ColourRole({ value, onChange }: { value: string; onChange: (role: string) => void }) {
  const l = useLabels();
  const id = useId();
  return (
    <>
      <Label htmlFor={id}>{l.item('role')}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-control border border-edge bg-field px-2 text-base text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
      >
        {COLOUR_ROLES.map((role) => (
          <option key={role} value={role}>
            {l.role(role)}
          </option>
        ))}
      </select>
    </>
  );
}

function FeelingForm({ values, set, error }: FormProps<'feeling'>) {
  const l = useLabels();
  const v = values as FeelingValues;
  const chips = (
    key: 'feeling' | 'placeSymbols' | 'senses' | 'searchTerms' | 'tone',
    max: number,
  ) => (
    <ChipsField
      label={l.field(key)}
      hint={l.items(max)}
      error={error(key)}
      words={v[key]}
      onChange={(words) => set({ ...v, [key]: words })}
    />
  );
  return (
    <>
      <TextField
        label={l.field('promise')}
        value={v.promise}
        multiline
        onChange={(promise) => set({ ...v, promise })}
        hint={l.words(LIMITS.promiseWords)}
        error={error('promise')}
      />
      {chips('feeling', LIMITS.feeling)}
      <ListField
        label={l.field('moments')}
        hint={l.items(LIMITS.moments)}
        error={error('moments')}
        items={v.moments}
        onChange={(moments) => set({ ...v, moments })}
        addLabel={l.list('addMoment')}
        newItem={() => ({ value: '' })}
        renderItem={(m, i, update) => (
          <TextField
            label={l.item('reason')}
            value={m.value}
            onChange={(value) => update({ ...m, value })}
            error={error(`moments.${i}`)}
          />
        )}
      />
      {chips('placeSymbols', LIMITS.placeSymbols)}
      {chips('senses', LIMITS.senses)}
      {chips('searchTerms', LIMITS.searchTerms)}
      {chips('tone', LIMITS.tone)}
    </>
  );
}

const FORMS: { [S in SectionId]: (props: FormProps<S>) => ReactNode } = {
  business: BusinessForm,
  place: PlaceForm,
  contact: ContactForm,
  look: LookForm,
  feeling: FeelingForm,
};

// The form opened for one field (docs/specs/platform/friendlier-home, the
// missing block's "+ Phone"): its input, or a list's own "Add", takes focus.
function focusField(root: HTMLElement, label: string): boolean {
  for (const el of root.querySelectorAll('label')) {
    const target = el.htmlFor ? root.ownerDocument.getElementById(el.htmlFor) : null;
    if (el.textContent?.trim() === label && target) {
      target.focus();
      return true;
    }
  }
  for (const legend of root.querySelectorAll('legend')) {
    if (legend.textContent?.trim() !== label) continue;
    const box = legend.parentElement;
    const add =
      box?.querySelector<HTMLElement>('input:not([type="hidden"])') ??
      [...(box?.querySelectorAll<HTMLElement>('button') ?? [])].at(-1);
    if (add) {
      add.focus();
      return true;
    }
  }
  return false;
}

function SectionForm({
  profile,
  section,
  focus,
  onSave,
  onClose,
}: {
  profile: Profile;
  section: SectionId;
  focus: FieldKey | null;
  onSave: (profile: Profile) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations('brand.edit');
  const panel = useTranslations('brand.panel');
  const [initial] = useState(() => sectionValues(profile, section));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const Form = FORMS[section] as (props: FormProps<SectionId>) => ReactNode;

  const requestClose = () => (dirty ? setConfirming(true) : onClose());

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = applySection(profile, section, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      await onSave(result.profile);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && requestClose()}>
      <SheetContent
        onOpenAutoFocus={(event) => {
          if (focus && focusField(event.currentTarget as HTMLElement, panel(`fields.${focus}`))) {
            event.preventDefault();
          }
        }}
      >
        <form onSubmit={save} noValidate className="flex min-h-0 flex-col">
          <div className="px-5 pt-5 pb-3">
            <SheetTitle>{panel(`sections.${section}`)}</SheetTitle>
            <SheetDescription className="mt-1">{t('englishHint')}</SheetDescription>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
            <Form
              values={values}
              set={setValues}
              profile={profile}
              error={(key) => (errors[key] ? t(`errors.${errors[key]}`) : undefined)}
            />
          </div>
          <div className="flex gap-2 border-t border-edge px-5 pt-3 pb-5">
            <button
              type="button"
              onClick={requestClose}
              className="press inline-flex h-12 w-full items-center justify-center rounded-control border border-edge px-4 text-[15px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('cancel')}
            </button>
            <Button type="submit" disabled={saving}>
              {t('save')}
            </Button>
          </div>
        </form>
      </SheetContent>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogTitle>{t('discardTitle')}</AlertDialogTitle>
          <div className="flex gap-2">
            <AlertDialogCancel>{t('keepEditing')}</AlertDialogCancel>
            <AlertDialogAction destructive onClick={onClose}>
              {t('discard')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

export function SectionSheet({
  profile,
  section,
  focus = null,
  onSave,
  onClose,
}: {
  profile: Profile;
  section: SectionId | null;
  focus?: FieldKey | null;
  onSave: (profile: Profile) => Promise<void>;
  onClose: () => void;
}) {
  if (!section) return null;
  return (
    <SectionForm
      key={section}
      profile={profile}
      section={section}
      focus={focus}
      onSave={onSave}
      onClose={onClose}
    />
  );
}
