"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type SellStep = {
  title: string;
  text: string;
  image: string;
  imageAlt: string;
};

type SellStepsCarouselProps = {
  steps: SellStep[];
};

function isDesktopCarousel() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

export function SellStepsCarousel({ steps }: SellStepsCarouselProps) {
  const viewportRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    offset: 0,
    startX: 0,
  });
  const boundsRef = useRef({
    min: 0,
    max: 0,
  });
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function clampOffset(nextOffset: number) {
    return Math.min(boundsRef.current.max, Math.max(boundsRef.current.min, nextOffset));
  }

  const updateBounds = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;

    if (!viewport || !track || !isDesktopCarousel()) {
      boundsRef.current = { min: 0, max: 0 };
      setOffset(0);
      return;
    }

    const min = Math.min(0, viewport.clientWidth - track.scrollWidth);
    boundsRef.current = { min, max: 0 };
    setOffset((currentOffset) => Math.min(0, Math.max(min, currentOffset)));
  }, []);

  useEffect(() => {
    updateBounds();

    const viewport = viewportRef.current;
    const track = trackRef.current;

    if (!viewport || !track) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);
    window.addEventListener("resize", updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [updateBounds]);

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    const viewport = viewportRef.current;

    if (!viewport || !isDesktopCarousel() || boundsRef.current.min === 0) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      offset,
      startX: event.clientX,
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;

    if (!dragState.isDragging) {
      return;
    }

    event.preventDefault();
    setOffset(clampOffset(dragState.offset + event.clientX - dragState.startX));
  }

  function endDrag() {
    dragStateRef.current.isDragging = false;
    setIsDragging(false);
  }

  return (
    <section
      ref={viewportRef}
      className={[
        "-mx-4 overflow-visible px-4 pb-10 pt-1",
        "md:mx-0 md:w-full md:px-0 md:pb-16 md:pt-0 md:touch-pan-y",
        isDragging ? "md:cursor-grabbing md:select-none" : "md:cursor-grab",
      ].join(" ")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        ref={trackRef}
        className="flex flex-col gap-4 md:w-max md:flex-row"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="flex w-full min-w-0 flex-col gap-4 rounded-[32px] bg-gf-bg-alt p-4 md:grid md:h-[229px] md:w-[460px] md:min-w-[460px] md:grid-cols-[258px_160px] md:items-start md:gap-2.5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-4 md:w-[258px] md:flex-none">
              <span className="grid size-12 place-items-center rounded-full bg-gf-bg-accent text-gf-body-m font-bold leading-none text-gf-text-on-accent">
                {index + 1}
              </span>
              <div className="grid gap-2 md:mt-4">
                <h2 className="text-pretty text-gf-body-l font-bold leading-[1.08] text-gf-text-primary md:text-[18px]">
                  {step.title}
                </h2>
                <p className="text-pretty text-gf-body-m leading-[1.08] text-gf-text-secondary md:text-[16px]">
                  {step.text}
                </p>
              </div>
            </div>
            <div className="relative aspect-[296/197] w-full shrink-0 overflow-hidden rounded-2xl md:h-[197px] md:w-[160px]">
              <Image
                src={step.image}
                alt={step.imageAlt}
                fill
                sizes="(min-width: 768px) 160px, calc(100vw - 64px)"
                className="object-cover outline outline-1 -outline-offset-1 outline-black/10"
                draggable={false}
                unoptimized
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
