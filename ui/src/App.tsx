import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Layout } from "./components/Layout";
import { authApi } from "./api/auth";
import { healthApi } from "./api/health";
import { PageSkeleton } from "./components/PageSkeleton";
import { CliAuthPage } from "./pages/CliAuth";
import { queryKeys } from "./lib/queryKeys";
import { useCompany } from "./context/CompanyContext";
import { useDialog } from "./context/DialogContext";
import { loadLastInboxTab } from "./lib/inbox";
import { shouldRedirectCompanylessRouteToOnboarding } from "./lib/onboarding-route";

const DashboardPage = lazy(() => import("./pages/Dashboard").then((mod) => ({ default: mod.Dashboard })));
const OnboardingWizard = lazy(() =>
  import("./components/OnboardingWizard").then((mod) => ({ default: mod.OnboardingWizard })),
);
const CompaniesPage = lazy(() => import("./pages/Companies").then((mod) => ({ default: mod.Companies })));
const AgentsPage = lazy(() => import("./pages/Agents").then((mod) => ({ default: mod.Agents })));
const AgentDetailPage = lazy(() => import("./pages/AgentDetail").then((mod) => ({ default: mod.AgentDetail })));
const ProjectsPage = lazy(() => import("./pages/Projects").then((mod) => ({ default: mod.Projects })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetail").then((mod) => ({ default: mod.ProjectDetail })));
const IssuesPage = lazy(() => import("./pages/Issues").then((mod) => ({ default: mod.Issues })));
const IssueDetailPage = lazy(() => import("./pages/IssueDetail").then((mod) => ({ default: mod.IssueDetail })));
const RoutinesPage = lazy(() => import("./pages/Routines").then((mod) => ({ default: mod.Routines })));
const RoutineDetailPage = lazy(() => import("./pages/RoutineDetail").then((mod) => ({ default: mod.RoutineDetail })));
const ExecutionWorkspaceDetailPage = lazy(() =>
  import("./pages/ExecutionWorkspaceDetail").then((mod) => ({ default: mod.ExecutionWorkspaceDetail })),
);
const GoalsPage = lazy(() => import("./pages/Goals").then((mod) => ({ default: mod.Goals })));
const GoalDetailPage = lazy(() => import("./pages/GoalDetail").then((mod) => ({ default: mod.GoalDetail })));
const ApprovalsPage = lazy(() => import("./pages/Approvals").then((mod) => ({ default: mod.Approvals })));
const ApprovalDetailPage = lazy(() => import("./pages/ApprovalDetail").then((mod) => ({ default: mod.ApprovalDetail })));
const CostsPage = lazy(() => import("./pages/Costs").then((mod) => ({ default: mod.Costs })));
const ActivityPage = lazy(() => import("./pages/Activity").then((mod) => ({ default: mod.Activity })));
const InboxPage = lazy(() => import("./pages/Inbox").then((mod) => ({ default: mod.Inbox })));
const MemoryPage = lazy(() => import("./pages/Memory").then((mod) => ({ default: mod.Memory })));
const NotesPage = lazy(() => import("./pages/Notes").then((mod) => ({ default: mod.Notes })));
const CompanySettingsPage = lazy(() =>
  import("./pages/CompanySettings").then((mod) => ({ default: mod.CompanySettings })),
);
const CompanySkillsPage = lazy(() => import("./pages/CompanySkills").then((mod) => ({ default: mod.CompanySkills })));
const CompanyExportPage = lazy(() => import("./pages/CompanyExport").then((mod) => ({ default: mod.CompanyExport })));
const CompanyImportPage = lazy(() => import("./pages/CompanyImport").then((mod) => ({ default: mod.CompanyImport })));
const DesignGuidePage = lazy(() => import("./pages/DesignGuide").then((mod) => ({ default: mod.DesignGuide })));
const InstanceGeneralSettingsPage = lazy(() =>
  import("./pages/InstanceGeneralSettings").then((mod) => ({ default: mod.InstanceGeneralSettings })),
);
const InstanceSettingsPage = lazy(() => import("./pages/InstanceSettings").then((mod) => ({ default: mod.InstanceSettings })));
const InstanceExperimentalSettingsPage = lazy(() =>
  import("./pages/InstanceExperimentalSettings").then((mod) => ({ default: mod.InstanceExperimentalSettings })),
);
const PluginManagerPage = lazy(() => import("./pages/PluginManager").then((mod) => ({ default: mod.PluginManager })));
const PluginSettingsPage = lazy(() => import("./pages/PluginSettings").then((mod) => ({ default: mod.PluginSettings })));
const PluginPageView = lazy(() => import("./pages/PluginPage").then((mod) => ({ default: mod.PluginPage })));
const RunTranscriptUxLabPage = lazy(() =>
  import("./pages/RunTranscriptUxLab").then((mod) => ({ default: mod.RunTranscriptUxLab })),
);
const OrgChartPage = lazy(() => import("./pages/OrgChart").then((mod) => ({ default: mod.OrgChart })));
const NewAgentPage = lazy(() => import("./pages/NewAgent").then((mod) => ({ default: mod.NewAgent })));
const AuthPageView = lazy(() => import("./pages/Auth").then((mod) => ({ default: mod.AuthPage })));
const BoardClaimPageView = lazy(() => import("./pages/BoardClaim").then((mod) => ({ default: mod.BoardClaimPage })));
const InviteLandingPageView = lazy(() =>
  import("./pages/InviteLanding").then((mod) => ({ default: mod.InviteLandingPage })),
);
const NotFoundPageView = lazy(() => import("./pages/NotFound").then((mod) => ({ default: mod.NotFoundPage })));

function RouteFallback({ variant = "list" }: { variant?: Parameters<typeof PageSkeleton>[0]["variant"] }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageSkeleton variant={variant} />
    </div>
  );
}

function LazyRoute({
  children,
  variant = "list",
}: {
  children: ReactNode;
  variant?: Parameters<typeof PageSkeleton>[0]["variant"];
}) {
  return <Suspense fallback={<RouteFallback variant={variant} />}>{children}</Suspense>;
}

function BootstrapPendingPage({ hasActiveInvite = false }: { hasActiveInvite?: boolean }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Instance setup required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasActiveInvite
            ? "No instance admin exists yet. A bootstrap invite is already active. Check your Paperclip startup logs for the first admin invite URL, or run this command to rotate it:"
            : "No instance admin exists yet. Run this command in your Paperclip environment to generate the first admin invite URL:"}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
{`pnpm paperclipai auth bootstrap-ceo`}
        </pre>
      </div>
    </div>
  );
}

function CloudAccessGate() {
  const location = useLocation();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as
        | { deploymentMode?: "local_trusted" | "authenticated"; bootstrapStatus?: "ready" | "bootstrap_pending" }
        | undefined;
      return data?.deploymentMode === "authenticated" && data.bootstrapStatus === "bootstrap_pending"
        ? 2000
        : false;
    },
    refetchIntervalInBackground: true,
  });

  const isAuthenticatedMode = healthQuery.data?.deploymentMode === "authenticated";
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    enabled: isAuthenticatedMode,
    retry: false,
  });

  if (healthQuery.isLoading || (isAuthenticatedMode && sessionQuery.isLoading)) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  if (healthQuery.error) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {healthQuery.error instanceof Error ? healthQuery.error.message : "Failed to load app state"}
      </div>
    );
  }

  if (isAuthenticatedMode && healthQuery.data?.bootstrapStatus === "bootstrap_pending") {
    return <BootstrapPendingPage hasActiveInvite={healthQuery.data.bootstrapInviteActive} />;
  }

  if (isAuthenticatedMode && !sessionQuery.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <Outlet />;
}

function boardRoutes() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<LazyRoute variant="dashboard"><DashboardPage /></LazyRoute>} />
      <Route path="onboarding" element={<OnboardingRoutePage />} />
      <Route path="companies" element={<LazyRoute><CompaniesPage /></LazyRoute>} />
      <Route path="company/settings" element={<LazyRoute><CompanySettingsPage /></LazyRoute>} />
      <Route path="company/export/*" element={<LazyRoute><CompanyExportPage /></LazyRoute>} />
      <Route path="company/import" element={<LazyRoute><CompanyImportPage /></LazyRoute>} />
      <Route path="skills/*" element={<LazyRoute><CompanySkillsPage /></LazyRoute>} />
      <Route path="settings" element={<LegacySettingsRedirect />} />
      <Route path="settings/*" element={<LegacySettingsRedirect />} />
      <Route path="plugins/:pluginId" element={<LazyRoute><PluginPageView /></LazyRoute>} />
      <Route path="org" element={<LazyRoute variant="org-chart"><OrgChartPage /></LazyRoute>} />
      <Route path="agents" element={<Navigate to="/agents/all" replace />} />
      <Route path="agents/all" element={<LazyRoute><AgentsPage /></LazyRoute>} />
      <Route path="agents/active" element={<LazyRoute><AgentsPage /></LazyRoute>} />
      <Route path="agents/paused" element={<LazyRoute><AgentsPage /></LazyRoute>} />
      <Route path="agents/error" element={<LazyRoute><AgentsPage /></LazyRoute>} />
      <Route path="agents/new" element={<LazyRoute><NewAgentPage /></LazyRoute>} />
      <Route path="agents/:agentId" element={<LazyRoute variant="detail"><AgentDetailPage /></LazyRoute>} />
      <Route path="agents/:agentId/:tab" element={<LazyRoute variant="detail"><AgentDetailPage /></LazyRoute>} />
      <Route path="agents/:agentId/runs/:runId" element={<LazyRoute variant="detail"><AgentDetailPage /></LazyRoute>} />
      <Route path="projects" element={<LazyRoute><ProjectsPage /></LazyRoute>} />
      <Route path="projects/:projectId" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="projects/:projectId/overview" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="projects/:projectId/issues" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="projects/:projectId/issues/:filter" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="projects/:projectId/configuration" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="projects/:projectId/budget" element={<LazyRoute variant="detail"><ProjectDetailPage /></LazyRoute>} />
      <Route path="issues" element={<LazyRoute variant="issues-list"><IssuesPage /></LazyRoute>} />
      <Route path="issues/all" element={<Navigate to="/issues" replace />} />
      <Route path="issues/active" element={<Navigate to="/issues" replace />} />
      <Route path="issues/backlog" element={<Navigate to="/issues" replace />} />
      <Route path="issues/done" element={<Navigate to="/issues" replace />} />
      <Route path="issues/recent" element={<Navigate to="/issues" replace />} />
      <Route path="issues/:issueId" element={<LazyRoute variant="detail"><IssueDetailPage /></LazyRoute>} />
      <Route path="routines" element={<LazyRoute><RoutinesPage /></LazyRoute>} />
      <Route path="routines/:routineId" element={<LazyRoute><RoutineDetailPage /></LazyRoute>} />
      <Route path="execution-workspaces/:workspaceId" element={<LazyRoute><ExecutionWorkspaceDetailPage /></LazyRoute>} />
      <Route path="goals" element={<LazyRoute><GoalsPage /></LazyRoute>} />
      <Route path="goals/:goalId" element={<LazyRoute variant="detail"><GoalDetailPage /></LazyRoute>} />
      <Route path="approvals" element={<Navigate to="/approvals/pending" replace />} />
      <Route path="approvals/pending" element={<LazyRoute variant="approvals"><ApprovalsPage /></LazyRoute>} />
      <Route path="approvals/all" element={<LazyRoute variant="approvals"><ApprovalsPage /></LazyRoute>} />
      <Route path="approvals/:approvalId" element={<LazyRoute variant="detail"><ApprovalDetailPage /></LazyRoute>} />
      <Route path="costs" element={<LazyRoute variant="costs"><CostsPage /></LazyRoute>} />
      <Route path="activity" element={<LazyRoute><ActivityPage /></LazyRoute>} />
      <Route path="inbox" element={<InboxRootRedirect />} />
      <Route path="inbox/recent" element={<LazyRoute variant="inbox"><InboxPage /></LazyRoute>} />
      <Route path="inbox/unread" element={<LazyRoute variant="inbox"><InboxPage /></LazyRoute>} />
      <Route path="inbox/all" element={<LazyRoute variant="inbox"><InboxPage /></LazyRoute>} />
      <Route path="inbox/new" element={<Navigate to="/inbox/recent" replace />} />
      <Route path="memory" element={<LazyRoute><MemoryPage /></LazyRoute>} />
      <Route path="notes" element={<LazyRoute><NotesPage /></LazyRoute>} />
      <Route path="design-guide" element={<LazyRoute><DesignGuidePage /></LazyRoute>} />
      <Route path="tests/ux/runs" element={<LazyRoute><RunTranscriptUxLabPage /></LazyRoute>} />
      <Route path=":pluginRoutePath" element={<LazyRoute><PluginPageView /></LazyRoute>} />
      <Route path="*" element={<LazyRoute><NotFoundPageView scope="board" /></LazyRoute>} />
    </>
  );
}

function InboxRootRedirect() {
  return <Navigate to={`/inbox/${loadLastInboxTab()}`} replace />;
}

function LegacySettingsRedirect() {
  const location = useLocation();
  return <Navigate to={`/instance/settings/general${location.search}${location.hash}`} replace />;
}

function OnboardingRoutePage() {
  const { companies } = useCompany();
  const { openOnboarding } = useDialog();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const matchedCompany = companyPrefix
    ? companies.find((company) => company.issuePrefix.toUpperCase() === companyPrefix.toUpperCase()) ?? null
    : null;

  const title = matchedCompany
    ? `Add another agent to ${matchedCompany.name}`
    : companies.length > 0
      ? "Create another company"
      : "Create your first company";
  const description = matchedCompany
    ? "Run onboarding again to add an agent and a starter task for this company."
    : companies.length > 0
      ? "Run onboarding again to create another company and seed its first agent."
      : "Get started by creating a company and your first agent.";

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <Button
            onClick={() =>
              matchedCompany
                ? openOnboarding({ initialStep: 2, companyId: matchedCompany.id })
                : openOnboarding()
            }
          >
            {matchedCompany ? "Add Agent" : "Start Onboarding"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyRootRedirect() {
  const { companies, selectedCompany, loading } = useCompany();
  const location = useLocation();

  if (loading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  const targetCompany = selectedCompany ?? companies[0] ?? null;
  if (!targetCompany) {
    if (
      shouldRedirectCompanylessRouteToOnboarding({
        pathname: location.pathname,
        hasCompanies: false,
      })
    ) {
      return <Navigate to="/onboarding" replace />;
    }
    return <NoCompaniesStartPage />;
  }

  return <Navigate to={`/${targetCompany.issuePrefix}/dashboard`} replace />;
}

function UnprefixedBoardRedirect() {
  const location = useLocation();
  const { companies, selectedCompany, loading } = useCompany();

  if (loading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  const targetCompany = selectedCompany ?? companies[0] ?? null;
  if (!targetCompany) {
    if (
      shouldRedirectCompanylessRouteToOnboarding({
        pathname: location.pathname,
        hasCompanies: false,
      })
    ) {
      return <Navigate to="/onboarding" replace />;
    }
    return <NoCompaniesStartPage />;
  }

  return (
    <Navigate
      to={`/${targetCompany.issuePrefix}${location.pathname}${location.search}${location.hash}`}
      replace
    />
  );
}

function NoCompaniesStartPage() {
  const { openOnboarding } = useDialog();

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Create your first company</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating a company.
        </p>
        <div className="mt-4">
          <Button onClick={() => openOnboarding()}>New Company</Button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const { onboardingOpen } = useDialog();
  return (
    <>
      <Routes>
        <Route path="cli-auth/:id" element={<CliAuthPage />} />
        <Route path="auth" element={<LazyRoute><AuthPageView /></LazyRoute>} />
        <Route path="board-claim/:token" element={<LazyRoute><BoardClaimPageView /></LazyRoute>} />
        <Route path="invite/:token" element={<LazyRoute><InviteLandingPageView /></LazyRoute>} />

        <Route element={<CloudAccessGate />}>
          <Route index element={<CompanyRootRedirect />} />
          <Route path="onboarding" element={<OnboardingRoutePage />} />
          <Route path="instance" element={<Navigate to="/instance/settings/general" replace />} />
          <Route path="instance/settings" element={<Layout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<LazyRoute><InstanceGeneralSettingsPage /></LazyRoute>} />
            <Route path="heartbeats" element={<LazyRoute><InstanceSettingsPage /></LazyRoute>} />
            <Route path="experimental" element={<LazyRoute><InstanceExperimentalSettingsPage /></LazyRoute>} />
            <Route path="plugins" element={<LazyRoute><PluginManagerPage /></LazyRoute>} />
            <Route path="plugins/:pluginId" element={<LazyRoute><PluginSettingsPage /></LazyRoute>} />
          </Route>
          <Route path="dashboard" element={<UnprefixedBoardRedirect />} />
          <Route path="companies" element={<UnprefixedBoardRedirect />} />
          <Route path="company/settings" element={<UnprefixedBoardRedirect />} />
          <Route path="company/export/*" element={<UnprefixedBoardRedirect />} />
          <Route path="company/import" element={<UnprefixedBoardRedirect />} />
          <Route path="issues" element={<UnprefixedBoardRedirect />} />
          <Route path="issues/:issueId" element={<UnprefixedBoardRedirect />} />
          <Route path="memory" element={<UnprefixedBoardRedirect />} />
          <Route path="notes" element={<UnprefixedBoardRedirect />} />
          <Route path="routines" element={<UnprefixedBoardRedirect />} />
          <Route path="routines/:routineId" element={<UnprefixedBoardRedirect />} />
          <Route path="skills/*" element={<UnprefixedBoardRedirect />} />
          <Route path="org" element={<UnprefixedBoardRedirect />} />
          <Route path="goals" element={<UnprefixedBoardRedirect />} />
          <Route path="goals/:goalId" element={<UnprefixedBoardRedirect />} />
          <Route path="approvals" element={<UnprefixedBoardRedirect />} />
          <Route path="approvals/pending" element={<UnprefixedBoardRedirect />} />
          <Route path="approvals/all" element={<UnprefixedBoardRedirect />} />
          <Route path="approvals/:approvalId" element={<UnprefixedBoardRedirect />} />
          <Route path="costs" element={<UnprefixedBoardRedirect />} />
          <Route path="activity" element={<UnprefixedBoardRedirect />} />
          <Route path="inbox" element={<UnprefixedBoardRedirect />} />
          <Route path="inbox/recent" element={<UnprefixedBoardRedirect />} />
          <Route path="inbox/unread" element={<UnprefixedBoardRedirect />} />
          <Route path="inbox/all" element={<UnprefixedBoardRedirect />} />
          <Route path="inbox/new" element={<UnprefixedBoardRedirect />} />
          <Route path="settings" element={<LegacySettingsRedirect />} />
          <Route path="settings/*" element={<LegacySettingsRedirect />} />
          <Route path="agents" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/new" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId/:tab" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId/runs/:runId" element={<UnprefixedBoardRedirect />} />
          <Route path="projects" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/overview" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/issues" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/issues/:filter" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/configuration" element={<UnprefixedBoardRedirect />} />
          <Route path="tests/ux/runs" element={<UnprefixedBoardRedirect />} />
          <Route path=":companyPrefix" element={<Layout />}>
            {boardRoutes()}
          </Route>
          <Route path="*" element={<LazyRoute><NotFoundPageView scope="global" /></LazyRoute>} />
        </Route>
      </Routes>
      <Suspense fallback={null}>
        {onboardingOpen ? <OnboardingWizard /> : null}
      </Suspense>
    </>
  );
}
