import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.tiktok.com https://www.facebook.com https://www.instagram.com https://app.veo.co;
            style-src 'self' 'unsafe-inline' https://app.veo.co;
            img-src 'self' data: https:;
            frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.facebook.com https://www.instagram.com https://www.tiktok.com https://app.veo.co https://api.veo.co;
            connect-src 'self' https://*.supabase.co http://localhost:54321 https://api.veo.co https://app.veo.co;
            font-src 'self';
            media-src 'self' https://app.veo.co https://c.veocdn.com;
          `}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
