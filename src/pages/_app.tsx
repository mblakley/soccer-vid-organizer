import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TeamProvider } from "@/contexts/TeamContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <TeamProvider>
        <Component {...pageProps} />
      </TeamProvider>
    </ThemeProvider>
  );
}
