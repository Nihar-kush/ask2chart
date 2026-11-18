import type { AnalysisPlan } from "@/types/analysis";

export type Dashboard = {
  id: string;
  title: string;
  createdAt: number;
};

export type DashboardChart = {
  id: string;
  dashboardId: string;
  datasetId: string;
  title: string;
  plan: AnalysisPlan;
  createdAt: number;
};
