import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/Reveal";
import { useJsonList, type Review } from "@/hooks/useJson";
import { usePreview } from "@/lib/preview";

/** Genuine reviews only: supplied by the owner in public/reviews.json (with the customer's permission and a source). */
export function Reviews() {
  const { t } = useTranslation();
  const reviews = useJsonList<Review>("/reviews.json").slice(0, 3);
  const preview = usePreview();
  if (reviews.length === 0 && !preview) return null;
  return (
    <section className="section-y border-y border-line bg-surface" aria-labelledby="reviews-h">
      <div className="container-x">
        <Reveal><p className="eyebrow mb-4">{t("home.reviewsEyebrow")}</p><h2 id="reviews-h" className="t-h2 mb-12">{t("home.reviewsTitle")}</h2></Reveal>
        {reviews.length === 0 ? (
          <p className="border border-dashed border-line-strong p-8 text-muted">{t("home.reviewsPreviewNote")}</p>
        ) : (
          <ul className="grid gap-10 md:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal as="li" key={i} delay={i * 80}>
                {typeof r.rating === "number" && <p className="mb-4 flex gap-0.5 text-fg" aria-label={`${r.rating} / 5`}>{Array.from({ length: 5 }, (_, k) => <Star key={k} className={`size-4 ${k < r.rating! ? "fill-current" : "text-line-strong"}`} />)}</p>}
                <blockquote className="t-serif text-2xl leading-snug sm:text-3xl">“{r.text}”</blockquote>
                <p className="mt-5 font-display text-base font-semibold uppercase tracking-[0.16em]">{r.author}</p>
                {r.source && <p className="text-sm text-muted">{r.url ? <a className="underline-offset-4 hover:underline" href={r.url} target="_blank" rel="noreferrer">{r.source}</a> : r.source}</p>}
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
