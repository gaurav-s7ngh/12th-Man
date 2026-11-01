import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { OverviewPage } from "../pages/OverviewPage";
import { SquadPage } from "../pages/SquadPage";
import { TacticsPage } from "../pages/TacticsPage";
import { RecruitmentPage } from "../pages/RecruitmentPage";
import { ScoutingPage } from "../pages/ScoutingPage";
import { AnalyticsLabPage } from "../pages/AnalyticsLabPage";
import { ShortlistsPage } from "../pages/ShortlistsPage";
import { ComparePage } from "../pages/ComparePage";
import { ScenariosPage } from "../pages/ScenariosPage";
import { PlayerDetailPage } from "../pages/PlayerDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: "squad",
        element: <SquadPage />,
      },
      {
        path: "tactics",
        element: <TacticsPage />,
      },
      {
        path: "recruitment",
        element: <RecruitmentPage />,
      },
      {
        path: "scouting",
        element: <ScoutingPage />,
      },
      {
        path: "analytics-lab",
        element: <AnalyticsLabPage />,
      },
      {
        path: "shortlists",
        element: <ShortlistsPage />,
      },
      {
        path: "compare",
        element: <ComparePage />,
      },
      {
        path: "scenarios",
        element: <ScenariosPage />,
      },
      {
        path: "players/:id",
        element: <PlayerDetailPage />,
      },
      // Backward-compatible alias routes
      {
        path: "players",
        element: <Navigate to="/scouting" replace />,
      },
      {
        path: "teams",
        element: <Navigate to="/squad" replace />,
      },
      {
        path: "matches",
        element: <Navigate to="/tactics" replace />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
