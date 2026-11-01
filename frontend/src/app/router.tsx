import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { OverviewPage } from "../pages/OverviewPage";
import { PlayersPage } from "../pages/PlayersPage";
import { PlayerDetailPage } from "../pages/PlayerDetailPage";
import { TeamsPage } from "../pages/TeamsPage";
import { MatchesPage } from "../pages/MatchesPage";
import { CompetitionsPage } from "../pages/CompetitionsPage";
import { ScoutingPage } from "../pages/ScoutingPage";
import { ShortlistsPage } from "../pages/ShortlistsPage";

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
        path: "players",
        element: <PlayersPage />,
      },
      {
        path: "players/:id",
        element: <PlayerDetailPage />,
      },
      {
        path: "teams",
        element: <TeamsPage />,
      },
      {
        path: "matches",
        element: <MatchesPage />,
      },
      {
        path: "competitions",
        element: <CompetitionsPage />,
      },
      {
        path: "scouting",
        element: <ScoutingPage />,
      },
      {
        path: "shortlists",
        element: <ShortlistsPage />,
      },
    ],
  },
]);
