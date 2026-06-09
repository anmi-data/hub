import { Camera, Code2, MessageCircle, MessagesSquare, Play, Send, X } from "lucide-react";
import type { NavigationItem } from "../types/home";
import type { SocialLink } from "../types/home";

export const homeNavigation: NavigationItem[] = [
  { label: "Strategies", href: "/strategies" },
  { label: "Methodology", href: "#methodology" },
  { label: "Alerts", href: "#media" },
];

export const socialLinks: SocialLink[] = [
  { label: "Telegram", href: "https://t.me/", icon: Send },
  { label: "WeChat", href: "https://www.wechat.com/", icon: MessageCircle },
  { label: "Discord", href: "https://discord.com/", icon: MessagesSquare },
  { label: "X", href: "https://x.com/", icon: X },
  { label: "Github", href: "https://github.com/", icon: Code2 },
  { label: "Instagram", href: "https://www.instagram.com/", icon: Camera },
  { label: "Youtube", href: "https://www.youtube.com/", icon: Play },
];
