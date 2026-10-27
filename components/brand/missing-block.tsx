'use client';

import { useTranslations } from 'next-intl';
import type { MissingField } from '@/lib/brand/missing';

// What Shopfront couldn't find, first on "Your business"
// (docs/specs/platform/friendlier-home): how many, then one button per field
// a form can fill, each opening its section's form on that field. WhatsApp
// and town are counted but not listed: their warnings above are their buttons.
export function MissingBlock({
  listed,
  count,
  onAdd,
}: {
  listed: MissingField[];
  count: number;
  onAdd: (missing: MissingField) => void;
}) {
  const t = useTranslations('brand');
  if (count === 0) return null;
  return (
    <section
      aria-labelledby="missing-title"
      className="flex flex-col gap-3 rounded-control bg-accent-tint px-4 py-4"
    >
      <div>
        <h2 id="missing-title" className="text-[16px] font-medium text-accent-tint-ink">
          {t('missing.title', { count })}
        </h2>
        {/* Says posts don't need what's below, so only with buttons below:
            WhatsApp, which posts do need, is never one. */}
        {listed.length > 0 && (
          <p className="mt-0.5 text-[13px] leading-normal text-accent-tint-ink">
            {t('missing.body')}
          </p>
        )}
      </div>
      {listed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {listed.map((missing) => {
            const label = t(`panel.fields.${missing.field}`);
            return (
              <button
                key={missing.field}
                type="button"
                aria-label={t('missing.add', { field: label })}
                onClick={() => onAdd(missing)}
                className="press min-h-11 rounded-control border border-accent bg-field px-3.5 text-[14px] text-accent-tint-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                + {label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
