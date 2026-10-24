'use client';

import { WarningCircle } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext } from 'react';
import type { SourceKind } from '@/lib/brand/display';
import type { SectionId } from '@/lib/brand/edit';
import type { PartialProfile } from '@/lib/brand/profile';
import { SourceNote } from './source-note';

// The brand panel (docs/specs/brand/brand-panel, "The panel"): five section
// cards showing what Shopfront understood, each fact with its source. While
// a read streams it shows a partial profile and nothing can be edited.

type Sourced = { value?: string; source?: string } | null | undefined;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

type PanelProps = {
  profile: PartialProfile;
  editable: boolean;
  onEdit: (section: SectionId) => void;
};

type FieldProps = {
  label: string;
  section: SectionId;
  filled: boolean;
  warning?: string;
  children?: ReactNode;
};

function Placeholder() {
  return <span aria-hidden className="mt-1 block h-4 w-2/3 animate-pulse rounded bg-field-muted" />;
}

const PanelContext = createContext<{ editable: boolean; onEdit: (section: SectionId) => void }>({
  editable: false,
  onEdit: () => {},
});

function Field({ label, section, filled, warning, children }: FieldProps) {
  const t = useTranslations('brand.panel');
  const { editable, onEdit } = useContext(PanelContext);
  return (
    <div data-field className="py-2.5">
      <p className="text-[13px] text-ink-secondary">{label}</p>
      {filled ? (
        <div className="text-[15px] leading-normal text-ink">{children}</div>
      ) : !editable ? (
        <Placeholder />
      ) : (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[15px]">
          {warning ? (
            <span className="inline-flex items-start gap-1.5 text-error">
              <WarningCircle aria-hidden className="mt-1 shrink-0" size={16} />
              {warning}
            </span>
          ) : (
            <span className="text-ink-secondary">{t('notFound')}</span>
          )}
          <button
            type="button"
            onClick={() => onEdit(section)}
            className="min-h-11 font-medium text-accent underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('add')}
          </button>
        </p>
      )}
    </div>
  );
}

function SourcedField({
  label,
  section,
  field,
  warning,
  kind,
}: {
  label: string;
  section: SectionId;
  field: Sourced;
  warning?: string;
  kind?: SourceKind;
}) {
  const value = text(field?.value);
  return (
    <Field label={label} section={section} filled={!!value} warning={warning}>
      {value}
      <SourceNote source={field?.source} kind={kind} />
    </Field>
  );
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const t = useTranslations('brand.panel');
  const { editable, onEdit } = useContext(PanelContext);
  const title = t(`sections.${id}`);
  return (
    <section className="rounded-control border border-edge bg-field px-4 pt-3 pb-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h2>
        {editable && (
          <button
            type="button"
            aria-label={t('editSection', { section: title })}
            onClick={() => onEdit(id)}
            className="min-h-11 px-1 text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('edit')}
          </button>
        )}
      </div>
      <div className="divide-y divide-edge">{children}</div>
    </section>
  );
}

export function BrandPanel({ profile, editable, onEdit }: PanelProps) {
  const t = useTranslations('brand.panel');
  const f = (key: string) => t(`fields.${key}` as 'fields.name');

  const name = text(profile.name?.value);
  const offerings = (profile.offerings ?? []).filter((o) => text(o?.name) || text(o?.price));
  const highlights = (profile.highlights ?? []).filter((h) => text(h?.value));
  const colours = (profile.colours ?? []).filter((c) => text(c?.hex));
  const moments = (profile.essence?.moments ?? []).filter((m) => text(m?.value));
  const words = (list: (string | undefined)[] | undefined) =>
    (list ?? []).filter((w): w is string => !!text(w));
  const style = profile.visualStyle;
  const photos = words(profile.photoUrls);
  const logo = text(profile.logoUrl?.value);

  return (
    <PanelContext value={{ editable, onEdit }}>
      <div className="flex flex-col gap-3">
        {editable && profile.thin && (
          <p
            role="note"
            className="rounded-control bg-accent-tint px-4 py-3 text-[15px] text-accent-tint-ink"
          >
            {t('thin')}
          </p>
        )}

        <Section id="business">
          <SourcedField label={f('name')} section="business" field={profile.name} />
          <SourcedField label={f('summary')} section="business" field={profile.summary} />
          <Field label={f('category')} section="business" filled={!!text(profile.category)}>
            {profile.category}
          </Field>
          <Field label={f('offerings')} section="business" filled={offerings.length > 0}>
            <ul className="flex flex-col gap-2">
              {offerings.map((o, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: offerings have no id and may repeat a name
                <li key={i}>
                  <span>{o?.name}</span>
                  {[o?.price, o?.duration].filter(text).length > 0 && (
                    <span className="text-ink-secondary">
                      {' '}
                      · {[o?.price, o?.duration].filter(text).join(' · ')}
                    </span>
                  )}
                  {text(o?.description) && (
                    <span className="block text-[13px] text-ink-secondary">{o?.description}</span>
                  )}
                  <SourceNote source={o?.source} />
                </li>
              ))}
            </ul>
          </Field>
          <Field label={f('highlights')} section="business" filled={highlights.length > 0}>
            <ul className="flex flex-col gap-2">
              {highlights.map((h, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: highlights have no id
                <li key={i}>
                  {h?.value}
                  <SourceNote source={h?.source} />
                </li>
              ))}
            </ul>
          </Field>
        </Section>

        <Section id="place">
          <SourcedField
            label={f('town')}
            section="place"
            field={profile.location?.town}
            warning={t('warnTown')}
          />
          <SourcedField label={f('area')} section="place" field={profile.location?.area} />
          <SourcedField label={f('address')} section="place" field={profile.location?.address} />
          <SourcedField
            label={f('serviceArea')}
            section="place"
            field={profile.location?.serviceArea}
          />
          <SourcedField label={f('hours')} section="place" field={profile.hours} />
        </Section>

        <Section id="contact">
          <SourcedField
            label={f('whatsapp')}
            section="contact"
            field={profile.contact?.whatsapp}
            warning={t('warnWhatsapp')}
          />
          <SourcedField label={f('phone')} section="contact" field={profile.contact?.phone} />
          <SourcedField label={f('email')} section="contact" field={profile.contact?.email} />
          <SourcedField
            label={f('instagram')}
            section="contact"
            field={profile.contact?.instagram}
          />
          <SourcedField
            label={f('bookingUrl')}
            section="contact"
            field={profile.contact?.bookingUrl}
          />
        </Section>

        <Section id="look">
          <Field label={f('logo')} section="look" filled={!!logo}>
            {/* biome-ignore lint/performance/noImgElement: hot-linked from the owner's site, not ours to optimise */}
            <img
              src={logo}
              alt={t('logoAlt', { name: name ?? '' })}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="mt-1 max-h-16 max-w-40 object-contain"
            />
            <SourceNote source={profile.logoUrl?.source} />
          </Field>
          <Field label={f('colours')} section="look" filled={colours.length > 0}>
            <ul className="mt-1 flex flex-col gap-2">
              {colours.map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a colour may repeat with another role
                <li key={i} data-field className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 size-8 shrink-0 rounded-control border border-edge"
                    style={{ backgroundColor: c?.hex }}
                  />
                  <span>
                    <span className="font-mono text-[13px]">{c?.hex}</span>
                    {c?.role && (
                      <span className="text-ink-secondary"> · {t(`roles.${c.role}`)}</span>
                    )}
                    <SourceNote source={c?.source} kind="guess" />
                  </span>
                </li>
              ))}
            </ul>
          </Field>
          <Field label={f('visualStyle')} section="look" filled={!!text(style?.summary)}>
            {style?.summary}
            <dl className="mt-1 text-[13px] text-ink-secondary">
              {(['palette', 'light', 'textures', 'mood'] as const).map((part) =>
                text(style?.[part]) ? (
                  <div key={part}>
                    <dt className="inline">{f(part)}: </dt>
                    <dd className="inline text-ink">{style?.[part]}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            <SourceNote source="model" kind="guess" />
          </Field>
          <Field label={f('photos')} section="look" filled={photos.length > 0}>
            <ul className="mt-1 grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <li key={url}>
                  {/* biome-ignore lint/performance/noImgElement: hot-linked from the owner's site, not ours to optimise */}
                  <img
                    src={url}
                    alt={t('photoAlt')}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="aspect-square w-full rounded-control object-cover"
                  />
                </li>
              ))}
            </ul>
          </Field>
        </Section>

        <Section id="feeling">
          <SourcedField label={f('promise')} section="feeling" field={profile.essence?.promise} />
          <Field
            label={f('feeling')}
            section="feeling"
            filled={words(profile.essence?.feeling).length > 0}
          >
            {words(profile.essence?.feeling).join(', ')}
            <SourceNote source="model" kind="suggestion" />
          </Field>
          <Field label={f('moments')} section="feeling" filled={moments.length > 0}>
            <ul className="flex flex-col gap-2">
              {moments.map((m, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: moments have no id
                <li key={i}>
                  {m?.value}
                  <SourceNote source={m?.source} />
                </li>
              ))}
            </ul>
          </Field>
          <Field
            label={f('placeSymbols')}
            section="feeling"
            filled={words(profile.essence?.placeSymbols).length > 0}
          >
            {words(profile.essence?.placeSymbols).join(', ')}
            <SourceNote source="model" kind="suggestion" />
          </Field>
          <Field
            label={f('senses')}
            section="feeling"
            filled={words(profile.essence?.senses).length > 0}
          >
            {words(profile.essence?.senses).join(', ')}
            <SourceNote source="model" kind="suggestion" />
          </Field>
          <Field label={f('tone')} section="feeling" filled={words(profile.tone).length > 0}>
            {words(profile.tone).join(', ')}
          </Field>
        </Section>
      </div>
    </PanelContext>
  );
}
