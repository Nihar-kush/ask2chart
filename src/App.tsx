import { Link, Route, Routes } from "react-router";
import { ChartsPage } from "@/features/charts/ChartsPage";
import { DatasetsPage } from "@/features/datasets/DatasetsPage";
import { LandingPage } from "@/features/landing/LandingPage";
import { WorkspaceLayout } from "@/features/workspace/WorkspaceLayout";
import { WorkspaceOverview } from "@/features/workspace/WorkspaceOverview";

function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="workspace" element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceOverview />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="charts" element={<ChartsPage />} />
      </Route>
      <Route
        path="*"
        element={
          <main className="mx-auto max-w-5xl px-6 py-12">
            <h1 className="text-2xl font-semibold tracking-tight">
              Page not found
            </h1>
            <Link
              to="/"
              className="mt-4 inline-block underline underline-offset-4"
            >
              Back to home
            </Link>
          </main>
        }
      />
    </Routes>
  );
}

export default App;
