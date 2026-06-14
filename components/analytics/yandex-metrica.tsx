"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const yandexMetricaId = getYandexMetricaId();

export function YandexMetrica() {
  if (!yandexMetricaId) {
    return null;
  }

  return (
    <>
      <Script id="yandex-metrica" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {
              if (document.scripts[j].src === r) { return; }
            }
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${yandexMetricaId}", "ym");

          ym(${yandexMetricaId}, "init", {
            ssr: true,
            clickmap: true,
            ecommerce: "dataLayer",
            referrer: document.referrer,
            url: location.href,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: false
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <YandexMetricaPageViews />
      </Suspense>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${yandexMetricaId}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </noscript>
    </>
  );
}

function getYandexMetricaId() {
  const counterId = Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID);

  return Number.isFinite(counterId) && counterId > 0 ? counterId : null;
}

function YandexMetricaPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.ym || !yandexMetricaId) {
      return;
    }

    const query = searchParams.toString();
    window.ym(yandexMetricaId, "hit", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}
