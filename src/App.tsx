import { Link, Route, Routes } from "react-router";
import { DatasetsPage } from "@/features/datasets/DatasetsPage";
import { WorkspaceLayout } from "@/features/workspace/WorkspaceLayout";

function App() {
  return (
    <Routes>
      <Route
        index
        element={
          <main className="mx-auto max-w-5xl px-6 py-12">
            <h1 className="text-3xl font-semibold tracking-tight">Ask2Chart</h1>
            <Link
              to="/workspace"
              className="mt-4 inline-block underline underline-offset-4"
            >
              Workspace
            </Link>
          </main>
        }
      />
      <Route path="workspace" element={<WorkspaceLayout />}>
        <Route
          index
          element={
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Workspace
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No dataset selected.
              </p>
            </>
          }
        />
        <Route path="datasets" element={<DatasetsPage />} />
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
