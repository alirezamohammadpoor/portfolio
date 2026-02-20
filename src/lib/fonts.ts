import localFont from "next/font/local";

export const nhaas = localFont({
  src: [
    {
      path: "../../public/fonts/NHaasGroteskDSStd-55Rg.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-nhaas",
  display: "swap",
});

export const nastaliq = localFont({
  src: [
    {
      path: "../../public/fonts/NotoNastaliqUrdu-Regular.ttf",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-nastaliq",
  display: "swap",
});
