import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
};

export type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type MetricCardData = {
  label: string;
  value: string;
  note: string;
};

export type ValuePoint = {
  label: string;
  value: string;
};

export type MethodologyStep = {
  step: string;
  title: string;
  text: string;
};

export type NotificationEvent = {
  icon: LucideIcon;
  name: string;
  status: string;
  time: string;
  colorClass: string;
};

export type ChartDataPoint = {
  month: string;
  value: number;
  benchmark: number;
};

export type StrategyTag = string;
