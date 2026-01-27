import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Armoured Vehicles Market",
  description: "Next Gen Marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
