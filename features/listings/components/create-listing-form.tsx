"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cities, featuredCities } from "@/features/cities/data/cities";
import { createListingAction } from "@/features/listings/actions/create-listing";
import {
  maxFlowersCount,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import { ListingImagePicker } from "@/features/listings/components/listing-image-picker";
import { validateImageFiles } from "@/features/listings/utils/client-image-files";
import { compressImageFilesForUpload } from "@/features/listings/utils/compress-client-images";
import { uploadImagesDirectly } from "@/features/listings/utils/direct-image-upload";
import { getPriceRange, trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { ListingCardModel } from "@/types/listing";

type CreateListingFormProps = {
  city: string;
  sellerName?: string;
  sellerEmail?: string | null;
  onCreate: (listing: ListingCardModel) => void;
};

type FreshnessOption = {
  label: string;
  value: string;
  score: number;
  ageDays: number;
};

type ListingToastState = {
  id: number;
  message: string;
};

const totalSteps = 3;
const toastDurationMs = 3000;
const toastExitDurationMs = 200;

const freshnessOptions: FreshnessOption[] = [
  { label: "Сегодня", value: "today", score: 95, ageDays: 0 },
  { label: "Вчера", value: "one-day", score: 85, ageDays: 1 },
  { label: "2 дня назад", value: "two-days", score: 70, ageDays: 2 },
  { label: "3 дня назад", value: "three-days", score: 55, ageDays: 3 },
  { label: "Больше 3 дней назад", value: "older", score: 40, ageDays: 4 },
];

const flowerTypeOptions = [
  "Розы",
  "Пионы",
  "Тюльпаны",
  "Хризантемы",
  "Гортензии",
  "Лилии",
  "Эустомы",
  "Ирисы",
  "Герберы",
  "Орхидеи",
  "Эвкалипт",
];

export function CreateListingForm({ city, sellerName, sellerEmail, onCreate }: CreateListingFormProps) {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<ListingToastState | null>(null);
  const [imagePickerKey, setImagePickerKey] = useState(0);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFreshness, setSelectedFreshness] = useState(freshnessOptions[0].value);
  const [selectedCity, setSelectedCity] = useState(city);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [selectedFlowerTypes, setSelectedFlowerTypes] = useState<string[]>(["Розы"]);
  const [flowersCount, setFlowersCount] = useState("");
  const [listingType, setListingType] = useState<"sale" | "auction">("sale");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ignoreFinalSubmitUntilRef = useRef(0);
  const [, startTransition] = useTransition();

  const freshnessScore = useMemo(
    () => freshnessOptions.find((option) => option.value === selectedFreshness)?.score ?? 90,
    [selectedFreshness],
  );
  const receivedDaysAgo = useMemo(
    () => freshnessOptions.find((option) => option.value === selectedFreshness)?.ageDays ?? 0,
    [selectedFreshness],
  );

  const closeToast = useCallback((toastId: number) => {
    setToast((current) => (current?.id === toastId ? null : current));
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  function goHome() {
    window.location.href = "/";
  }

  function validateCurrentStep() {
    if (step === 1) {
      const imageError = validateImageFiles(imageFiles);

      if (imageError) {
        showError(imageError);
        return false;
      }

      if (!title.trim()) {
        showError("Добавьте название букета");
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (!selectedCity.trim()) {
        showError("Выберите город");
        return false;
      }

      if (flowersCount && Number(flowersCount) > maxFlowersCount) {
        showError("Проверьте количество цветов");
        return false;
      }

      return true;
    }

    if (!price || Number(price) <= 0) {
      showError("Добавьте цену");
      return false;
    }

    if (Number(price) > maxListingPrice) {
      showError("Проверьте цену — кажется, она слишком высокая");
      return false;
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      return;
    }

    if (step === totalSteps - 1) {
      setToast(null);
      ignoreFinalSubmitUntilRef.current = Date.now() + 700;
    }

    setStep((current) => Math.min(current + 1, totalSteps));
  }

  function handleBack() {
    ignoreFinalSubmitUntilRef.current = 0;
    setStep((current) => Math.max(current - 1, 1));
  }

  function toggleFlowerType(flowerType: string) {
    setSelectedFlowerTypes((current) => {
      if (current.includes(flowerType)) {
        return current.filter((item) => item !== flowerType);
      }

      return [...current, flowerType];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < totalSteps) {
      handleNext();
      return;
    }

    if (Date.now() < ignoreFinalSubmitUntilRef.current) {
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    const form = event.currentTarget;

    void (async () => {
      setIsSubmitting(true);

      let filesToUpload = imageFiles;

      try {
        if (imageFiles.length) {
          try {
            const compression = await compressImageFilesForUpload(imageFiles);
            filesToUpload = compression.files;
          } catch (compressionError) {
            console.error("Failed to compress listing images", compressionError);
            trackAnalyticsEvent("photo_upload_failed", {
              stage: "compression",
              filesCount: imageFiles.length,
            });
            showError("Не удалось подготовить фото. Попробуйте выбрать другие снимки.");
            return;
          }

          const compressedValidationError = validateImageFiles(filesToUpload);

          if (compressedValidationError) {
            trackAnalyticsEvent("photo_upload_failed", {
              stage: "client_validation",
              filesCount: filesToUpload.length,
            });
            showError(compressedValidationError);
            return;
          }
        }

        const formData = new FormData(form);

        if (filesToUpload.length) {
          const uploadedImageUrls = await uploadImagesDirectly(filesToUpload);
          uploadedImageUrls.forEach((imageUrl) => formData.append("imageUrls", imageUrl));
        }

        await new Promise<void>((resolve) => {
          startTransition(() => {
            void (async () => {
              try {
                const result = await createListingAction(formData);

                if (!result.ok) {
                  showError(result.error);
                  return;
                }

                trackAnalyticsEvent("listing_created", {
                  listingId: result.listing.id,
                  city: result.listing.city,
                  listingType: result.listing.type,
                  priceRange: getPriceRange(result.listing.price),
                  photosCount: result.listing.imageUrls?.length ?? 1,
                });
                onCreate(result.listing);
                form.reset();
                setImageFiles([]);
                setImagePickerKey((current) => current + 1);
                setTitle("");
                setDescription("");
                setSelectedFreshness(freshnessOptions[0].value);
                setSelectedCity(city);
                setSelectedFlowerTypes(["Розы"]);
                setFlowersCount("");
                setListingType("sale");
                setPrice("");
                setStep(1);
              } catch (submitError) {
                console.error("Failed to publish listing", submitError);
                showError(
                  submitError instanceof Error
                    ? submitError.message
                    : "Не удалось опубликовать объявление. Попробуйте ещё раз.",
                );
              } finally {
                resolve();
              }
            })();
          });
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <form
      className="mx-auto flex w-full max-w-[540px] flex-col items-center pb-20 pt-3"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <input name="sellerName" type="hidden" value={sellerName ?? ""} />
      <input name="sellerEmail" type="hidden" value={sellerEmail ?? ""} />
      <input name="title" type="hidden" value={title} />
      <input name="description" type="hidden" value={description} />
      <input name="city" type="hidden" value={selectedCity} />
      <input name="area" type="hidden" value="Не указан" />
      <input name="freshnessScore" type="hidden" value={freshnessScore} />
      <input name="receivedDaysAgo" type="hidden" value={receivedDaysAgo} />
      <input name="flowerTypes" type="hidden" value={selectedFlowerTypes.join(", ")} />
      <input name="flowersCount" type="hidden" value={flowersCount} />
      <input name="type" type="hidden" value={listingType} />
      <input name="price" type="hidden" value={price} />

      <div className="flex w-full flex-col items-center gap-6">
        <h1 className="text-center text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary">
          Расскажите о букете
        </h1>
        <ProgressBar step={step} />
      </div>

      <div className="mt-9 w-full">
        {step === 1 ? (
          <StepOne
            imagePickerKey={imagePickerKey}
            title={title}
            description={description}
            onFilesChange={setImageFiles}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
          />
        ) : null}

        {step === 2 ? (
          <StepTwo
            selectedFreshness={selectedFreshness}
            selectedCity={selectedCity}
            selectedFlowerTypes={selectedFlowerTypes}
            flowersCount={flowersCount}
            onFreshnessChange={setSelectedFreshness}
            onOpenCityPicker={() => setIsCityModalOpen(true)}
            onFlowerTypeToggle={toggleFlowerType}
            onFlowersCountChange={(value) => setFlowersCount(toDigits(value))}
          />
        ) : null}

        {step === 3 ? (
          <StepThree
            listingType={listingType}
            price={price}
            onListingTypeChange={setListingType}
            onPriceChange={(value) => setPrice(toDigits(value))}
          />
        ) : null}
      </div>

      {isCityModalOpen ? (
        <ListingCityPickerModal
          selectedCity={selectedCity}
          onSelect={(nextCity) => {
            setSelectedCity(nextCity);
            setIsCityModalOpen(false);
          }}
          onClose={() => setIsCityModalOpen(false)}
        />
      ) : null}

      <ListingFormToast toast={toast} onClose={closeToast} />

      <div className="mt-10 grid w-full max-w-[400px] grid-cols-2 gap-2">
        <Button
          className="h-[51px] rounded-2xl bg-gf-bg-accent-opposite text-gf-body-m font-medium leading-[normal] text-gf-text-action hover:bg-gf-bg-accent-opposite-hover"
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={step === 1 ? goHome : handleBack}
        >
          {step === 1 ? "На главное" : "Назад"}
        </Button>

        {step < totalSteps ? (
          <Button
            className="h-[51px] rounded-2xl text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent"
            type="button"
            disabled={isSubmitting}
            onClick={handleNext}
          >
            Дальше
          </Button>
        ) : (
          <Button
            className="h-[51px] rounded-2xl text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Публикуем..." : "Опубликовать"}
          </Button>
        )}
      </div>
    </form>
  );
}

function StepOne({
  imagePickerKey,
  title,
  description,
  onFilesChange,
  onTitleChange,
  onDescriptionChange,
}: {
  imagePickerKey: number;
  title: string;
  description: string;
  onFilesChange: (files: File[]) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <ListingImagePicker
          key={imagePickerKey}
          label={null}
          listClassName="gap-2 overflow-visible pb-0"
          showHint={false}
          tileClassName="size-[101px] w-[101px] rounded-[24px] bg-[#f2f2f2] sm:w-[101px]"
          onFilesChange={onFilesChange}
        />
        <div className="flex items-center gap-3 rounded-xl border border-gf-border p-4 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          <AlertCircleIcon className="size-6 shrink-0" />
          <p>
            Добавьте реальные фото букета. Так покупателю проще оценить состояние цветов.
          </p>
        </div>
      </div>

      <Field label="Название">
        <TextInput
          placeholder="Например, букет роз и пионов"
          value={title}
          onChange={onTitleChange}
        />
      </Field>

      <Field label="Что важно знать покупателю">
        <textarea
          className="min-h-20 w-full resize-none rounded-2xl bg-gf-bg-alt px-4 py-3.5 text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none placeholder:text-gf-text-secondary focus:ring-0 focus-visible:ring-0"
          placeholder="Например: подарили вчера, стоит в воде, упаковка целая"
          value={description}
          onChange={(event) => onDescriptionChange(event.currentTarget.value)}
        />
      </Field>
    </div>
  );
}

function StepTwo({
  selectedFreshness,
  selectedCity,
  selectedFlowerTypes,
  flowersCount,
  onFreshnessChange,
  onOpenCityPicker,
  onFlowerTypeToggle,
  onFlowersCountChange,
}: {
  selectedFreshness: string;
  selectedCity: string;
  selectedFlowerTypes: string[];
  flowersCount: string;
  onFreshnessChange: (value: string) => void;
  onOpenCityPicker: () => void;
  onFlowerTypeToggle: (value: string) => void;
  onFlowersCountChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <Field label="Когда получили букет">
        <div className="flex flex-wrap gap-2">
          {freshnessOptions.map((option) => (
            <ChipButton
              key={option.value}
              active={selectedFreshness === option.value}
              onClick={() => onFreshnessChange(option.value)}
            >
              {option.label}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Город">
        <button
          className="flex h-12 w-full items-center rounded-2xl bg-gf-bg-alt px-4 text-left text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none focus:ring-0 focus-visible:ring-0"
          type="button"
          onClick={onOpenCityPicker}
        >
          {selectedCity}
        </button>
      </Field>

      <Field label="Какие цветы в букете">
        <div className="flex flex-wrap gap-2">
          {flowerTypeOptions.map((flowerType) => (
            <ChipButton
              key={flowerType}
              active={selectedFlowerTypes.includes(flowerType)}
              onClick={() => onFlowerTypeToggle(flowerType)}
            >
              {flowerType}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Сколько цветов в букете">
        <TextInput
          inputMode="numeric"
          placeholder="24"
          value={flowersCount}
          onChange={onFlowersCountChange}
        />
      </Field>
    </div>
  );
}

function StepThree({
  listingType,
  price,
  onListingTypeChange,
  onPriceChange,
}: {
  listingType: "sale" | "auction";
  price: string;
  onListingTypeChange: (value: "sale" | "auction") => void;
  onPriceChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid h-[50px] grid-cols-2 gap-0.5 overflow-hidden rounded-full bg-[#f2f2f2] p-0.5">
        <button
          className={cn(
            "h-full rounded-full px-3 text-gf-body-m leading-[normal] transition-colors",
            listingType === "sale"
              ? "bg-gf-bg-base font-medium text-gf-text-primary shadow-[0_2px_4px_rgb(0_0_0/0.08)]"
              : "font-normal text-gf-text-secondary",
          )}
          type="button"
          onClick={() => onListingTypeChange("sale")}
        >
          Фиксированная цена
        </button>
        <button
          className={cn(
            "h-full rounded-full px-3 text-gf-body-m leading-[normal] transition-colors",
            listingType === "auction"
              ? "bg-gf-bg-base font-medium text-gf-text-primary shadow-[0_2px_4px_rgb(0_0_0/0.08)]"
              : "font-normal text-gf-text-secondary",
          )}
          type="button"
          onClick={() => onListingTypeChange("auction")}
        >
          На аукцион
        </button>
      </div>

      <div className="rounded-[24px] bg-gf-status-positive-pale p-6">
        <p className="text-gf-body-m font-semibold leading-[normal] text-gf-text-positive">
          Рекомендуемый диапазон
        </p>
        <p className="mt-3 text-[22px] font-black leading-[normal] text-gf-text-primary">
          2 000 ₽ - 3 000 ₽
        </p>
        <p className="mt-1 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          Такая цена обычно выглядит привлекательной для быстрой продажи
        </p>
      </div>

      <Field label="Ваша цена">
        <PriceInput
          value={price}
          onChange={onPriceChange}
        />
      </Field>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="h-[9px] w-full max-w-[368px] overflow-hidden rounded-full bg-gf-bg-alt">
      <div
        className="h-full rounded-full bg-gf-bg-accent transition-[width]"
        style={{ width: `${(step / totalSteps) * 100}%` }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-gf-body-m font-semibold leading-[normal] text-gf-text-primary">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "numeric";
}) {
  return (
    <input
      className="h-12 w-full rounded-2xl bg-gf-bg-alt px-4 text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none placeholder:text-gf-text-secondary focus:ring-0 focus-visible:ring-0"
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function PriceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const formattedValue = formatPriceDigits(value);

  return (
    <label className="flex h-12 w-full cursor-text items-center rounded-2xl bg-gf-bg-alt px-4 text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
      <input
        className="min-w-[1ch] bg-transparent outline-none placeholder:text-gf-text-secondary"
        inputMode="numeric"
        placeholder={isFocused ? "" : "2 000 ₽"}
        style={{ width: formattedValue ? `${formattedValue.length}ch` : undefined }}
        value={formattedValue}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(toDigits(event.currentTarget.value))}
        onFocus={() => setIsFocused(true)}
      />
      {formattedValue ? <span aria-hidden="true">&nbsp;₽</span> : null}
    </label>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-[39px] items-center justify-center rounded-2xl px-4 text-gf-body-xs font-medium leading-[normal] transition-colors",
        active
          ? "bg-gf-bg-accent text-gf-text-on-accent"
          : "bg-gf-bg-alt text-gf-text-primary hover:bg-[#f2f2f2]",
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ListingCityPickerModal({
  selectedCity,
  onSelect,
  onClose,
}: {
  selectedCity: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const visibleCities = useMemo(() => {
    const normalizedQuery = normalizeCitySearchValue(query);

    if (!normalizedQuery) {
      return featuredCities;
    }

    return cities
      .filter((cityItem) => normalizeCitySearchValue(cityItem.name).includes(normalizedQuery))
      .slice(0, 20);
  }, [query]);

  return (
    <div
      aria-labelledby="listing-city-picker-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[8px] md:items-center md:p-8"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[44px] bg-gf-bg-base px-8 pb-8 pt-8 shadow-2xl md:min-h-[362px] md:max-w-[840px] md:rounded-[44px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Закрыть выбор города"
          className="absolute right-8 top-8 flex size-10 items-center justify-center rounded-full bg-gf-bg-alt text-[28px] font-normal leading-none text-gf-text-primary"
          type="button"
          onClick={onClose}
        >
          ×
        </button>

        <h2
          className="pr-14 text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary"
          id="listing-city-picker-title"
        >
          Выберите регион или город
        </h2>

        <label className="mt-8 flex h-12 items-center gap-3 rounded-2xl bg-gf-bg-alt px-3 text-gf-text-secondary">
          <SearchIcon className="size-6 shrink-0" />
          <input
            className="min-w-0 flex-1 bg-transparent text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none placeholder:text-gf-text-secondary"
            placeholder="Поиск"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-2">
          {visibleCities.map((cityItem) => (
            <button
              key={cityItem.slug}
              className={cn(
                "h-[39px] rounded-2xl px-4 text-gf-body-m font-medium leading-[normal] transition-colors",
                cityItem.name === selectedCity
                  ? "bg-gf-bg-accent text-gf-text-on-accent"
                  : "bg-gf-bg-alt text-gf-text-primary hover:bg-gf-bg-accent-opposite",
              )}
              type="button"
              onClick={() => onSelect(cityItem.name)}
            >
              {cityItem.name}
            </button>
          ))}

          {!visibleCities.length ? (
            <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
              Город не найден
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListingFormToast({
  toast,
  onClose,
}: {
  toast: ListingToastState | null;
  onClose: (toastId: number) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, toastDurationMs);
    const closeTimer = window.setTimeout(() => {
      onClose(toast.id);
    }, toastDurationMs + toastExitDurationMs);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onClose, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed left-1/2 top-8 z-[90] flex min-h-12 -translate-x-1/2 items-center gap-2.5 rounded-full bg-gf-bg-base py-3 pl-4 pr-[18px] shadow-[0_4px_16px_rgb(0_0_0/0.16)] transition-all duration-200 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
      )}
      role="status"
    >
      <AlertCircleIcon className="size-6 shrink-0 text-gf-status-negative" />
      <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
        {toast.message}
      </p>
    </div>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function normalizeCitySearchValue(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function formatPriceDigits(value: string) {
  const digits = toDigits(value);

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Number(digits));
}

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}
