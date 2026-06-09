import type { FooterColumn } from "../types/home";

export const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Strategies", href: "/strategies" },
      { label: "Methodology", href: "#methodology" },
      { label: "Alerts", href: "#media" },
      { label: "Reports", href: "#methodology" },
    ],
  },
  {
    title: "Intelligence",
    links: [
      { label: "Track record quality", href: "#strategies" },
      { label: "Risk thresholds", href: "#media" },
      { label: "Verification status", href: "#media" },
      { label: "Forecast ranges", href: "#media" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "Telegram", href: "https://t.me/" },
      { label: "WeChat", href: "https://www.wechat.com/" },
      { label: "Discord", href: "https://discord.com/" },
      { label: "X", href: "https://x.com/" },
      { label: "Github", href: "https://github.com/" },
      { label: "Instagram", href: "https://www.instagram.com/" },
      { label: "Youtube", href: "https://www.youtube.com/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@anmi.example" },
      { label: "Investor preview", href: "#media" },
      { label: "Legal notes", href: "#methodology" },
    ],
  },
];
