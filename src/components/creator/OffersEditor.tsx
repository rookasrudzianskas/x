"use client";

import { Plus, Trash2 } from "lucide-react";
import { offerTitle } from "@/lib/creator-offers";
import { copy, type Locale } from "./profile-data";
import type { OfferDraft } from "./offer-drafts";
import shared from "./Creator.module.css";
import styles from "./Offers.module.css";

export function OffersEditor({
  rows,
  onChange,
  locale,
  disabled,
  invalidId,
}: {
  rows: OfferDraft[];
  onChange: (rows: OfferDraft[]) => void;
  locale: Locale;
  disabled: boolean;
  invalidId?: string;
}) {
  const customCount = rows.filter((row) => row.kind === "custom").length;
  const update = (id: string, patch: Partial<OfferDraft>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <div className={shared.rateEditor}>
      <span className={shared.eyebrow}>
        {copy(locale, "You set the price", "Kainą nustatai tu")}
      </span>
      <h3>
        {copy(locale, "Your work. Your rates.", "Tavo kūryba. Tavo įkainiai.")}
      </h3>
      <p className={shared.muted}>
        {copy(
          locale,
          "Choose the services you offer and set your asking prices in euros. Agree deliverables, usage rights and terms directly with the brand.",
          "Pasirink siūlomas paslaugas ir nustatyk kainas eurais. Darbus, naudojimo teises ir sąlygas derink su prekių ženklu.",
        )}
      </p>
      <div className={styles.list}>
        {rows.map((row, index) => (
          <div className={styles.offer} key={row.id} data-enabled={row.enabled}>
            <div className={styles.top}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={row.enabled}
                  onChange={(event) =>
                    update(row.id, { enabled: event.target.checked })
                  }
                />
                <span>
                  {row.kind === "custom"
                    ? row.title ||
                      copy(
                        locale,
                        `Custom offer ${index - 5}`,
                        `Individualus pasiūlymas ${index - 5}`,
                      )
                    : offerTitle(row, locale)}
                </span>
              </label>
              {row.kind === "custom" && (
                <button
                  type="button"
                  disabled={disabled}
                  className={shared.iconButton}
                  onClick={() =>
                    onChange(rows.filter((item) => item.id !== row.id))
                  }
                  aria-label={copy(
                    locale,
                    `Remove ${row.title || "custom offer"}`,
                    `Pašalinti ${row.title || "individualų pasiūlymą"}`,
                  )}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {row.enabled && (
              <div className={styles.fields}>
                {row.kind === "custom" && (
                  <label className={styles.customTitle}>
                    {copy(locale, "Offer title", "Pasiūlymo pavadinimas")}
                    <input
                      value={row.title}
                      maxLength={80}
                      required
                      disabled={disabled}
                      aria-invalid={invalidId === row.id || undefined}
                      onChange={(event) =>
                        update(row.id, { title: event.target.value })
                      }
                      placeholder={copy(
                        locale,
                        "For example: event coverage",
                        "Pavyzdžiui: renginio reportažas",
                      )}
                    />
                  </label>
                )}
                <label>
                  {copy(locale, "Your price (€)", "Tavo kaina (€)")}
                  <input
                    type="text"
                    inputMode="decimal"
                    maxLength={10}
                    required
                    disabled={disabled}
                    value={row.price}
                    aria-invalid={invalidId === row.id || undefined}
                    placeholder="0.00"
                    onChange={(event) =>
                      update(row.id, { price: event.target.value })
                    }
                  />
                </label>
                <label>
                  {copy(locale, "Per", "Už")}
                  <select
                    disabled={disabled}
                    value={row.unit}
                    onChange={(event) =>
                      update(row.id, {
                        unit: event.target.value as OfferDraft["unit"],
                      })
                    }
                  >
                    <option value="placement">
                      {copy(locale, "Placement", "Paskelbimą")}
                    </option>
                    <option value="week">
                      {copy(locale, "Week", "Savaitę")}
                    </option>
                  </select>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={shared.textButton}
        disabled={disabled || customCount >= 3}
        onClick={() =>
          onChange([
            ...rows,
            {
              id: `custom-${crypto.randomUUID()}`,
              kind: "custom",
              title: "",
              price: "",
              unit: "placement",
              enabled: true,
            },
          ])
        }
      >
        <Plus size={16} />
        {copy(locale, "Add a custom offer", "Pridėti individualų pasiūlymą")} (
        {customCount}/3)
      </button>
      <p className={shared.finePrint}>
        {copy(
          locale,
          "Choose at least one offer. Prices can be €0–€1,000,000 with up to two decimal places. These are your asking prices; no booking or payment is created.",
          "Pasirink bent vieną pasiūlymą. Kainos: 0–1 000 000 € su ne daugiau kaip dviem skaitmenimis po kablelio. Tai tavo prašomos kainos; užsakymas ar mokėjimas nesukuriamas.",
        )}
      </p>
    </div>
  );
}
