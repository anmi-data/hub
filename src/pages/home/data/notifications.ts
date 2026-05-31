import { Activity, CheckCircle2, TrendingUp, WifiOff } from "lucide-react";
import type { NotificationEvent } from "../types/home";

export const notificationEvents: NotificationEvent[] = [
  {
    icon: WifiOff,
    name: "Data connection",
    status: "Live account sync was interrupted",
    time: "18 min ago",
    colorClass: "text-rose-200",
  },
  {
    icon: Activity,
    name: "Risk limit",
    status: "Drawdown exceeded the expected band",
    time: "12 min ago",
    colorClass: "text-amber-200",
  },
  {
    icon: TrendingUp,
    name: "Exposure spike",
    status: "Market beta rose above the strategy norm",
    time: "7 min ago",
    colorClass: "text-amber-200",
  },
  {
    icon: CheckCircle2,
    name: "Recovery signal",
    status: "Risk returned inside the monitored range",
    time: "Just now",
    colorClass: "text-emerald-200",
  },
];
