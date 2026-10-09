"use client";

import Script from "next/script";

export default function GoogleAdsTag({ settings }) {
  if (!settings?.googleAds?.enabled || !settings?.googleAds?.conversionId) return null;

  const conversionId = settings.googleAds.conversionId;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${conversionId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${conversionId}');
        `}
      </Script>
    </>
  );
}
