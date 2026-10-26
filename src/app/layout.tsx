import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Royal Design Studio — Business Suite",
    template: "%s | Royal Design Studio",
  },
  description:
    "Enterprise Billing & Studio Operations Suite for Royal Design Studio — Digital Marketing, Graphic Design, Branding, Printing & Customized Gifting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="antialiased font-sans bg-[#080d1a] text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
