import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "EMOS Control Console",
  description: "EMOS 用户自助控制台",
  icons: {
    icon: "https://raw.githubusercontent.com/somebyteorg/emos_home/refs/heads/main/public/favicon.ico"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const s=localStorage.getItem('theme-mode');const h=new Date().getHours();const p=matchMedia('(prefers-color-scheme:dark)').matches;const d=s==='dark'||(!s||s==='system')&&(h>=19||h<7||p);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch{}})();`
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
