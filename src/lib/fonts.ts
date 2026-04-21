import localFont from "next/font/local";

export const parastoo = localFont({
  src: [
    {
      path: "../../public/fonts/Parastoo-VariableFont_wght.ttf",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-parastoo",
  display: "swap",
});
