import { Navigate, RouterProvider, useLocation } from 'react-router-dom';

import { PageTitle } from '@/app/components/page-title';
import { ChatPage } from '@/app/routes/chat';
import { EmbedPage } from '@/app/routes/embed';
import { RedirectPage } from '@/app/routes/redirect';
import { useEmbedding } from '@/components/embed-provider';
import { AcceptInvitation } from '@/features/members/component/accept-invitation';
import { routesThatRequireProjectId } from '@/lib/utils';
import { Permission } from '@activepieces/shared';

import { ApTableStateProvider } from '../../features/tables/components/ap-table-state-provider';
import { ProjectDashboardLayout } from '../components/project-layout';
import { BuilderNavigationSidebar } from '../components/sidebar/builder';
import NotFoundPage from '../routes/404-page';
import AuthenticatePage from '../routes/authenticate';
import { ChangePasswordPage } from '../routes/change-password';
import { AppConnectionsPage } from '../routes/connections';
import { EmbeddedConnectionDialog } from '../routes/embed/embedded-connection-dialog';
import { ExplorePage } from '../routes/explore';
import { FlowsPage } from '../routes/flows';
import { FlowBuilderPage } from '../routes/flows/id';
import { ResetPasswordPage } from '../routes/forget-password';
import { FormPage } from '../routes/forms';
import McpServersPage from '../routes/mcp-servers';
import McpPage from '../routes/mcp-servers/id';
import { ProjectReleasesPage } from '../routes/project-release';
import ViewRelease from '../routes/project-release/view-release';
import { VerifyEmail } from '@/features/authentication/components/verify-email';
import { BillingPage } from '@/app/routes/platform/setup/billing';

import { RunsPage } from '../routes/runs';
import { FlowRunPage } from '../routes/runs/id';
import { SignInPage } from '../routes/sign-in';
import { SignUpPage } from '../routes/sign-up';
import { ApTablesPage } from '../routes/tables';
import { ApTableEditorPage } from '../routes/tables/id';
import { ShareTemplatePage } from '../routes/templates/share-template';
import { TodosPage } from '../routes/todos';
import { TodoTestingPage } from '../routes/todos/id';

import { AfterImportFlowRedirect } from './after-import-flow-redirect';
import { DefaultRoute } from './default-route';
import { RoutePermissionGuard } from './permission-guard';
import {
  ProjectRouterWrapper,
  TokenCheckerWrapper,
} from './project-route-wrapper';

import { SettingsPage } from '../routes/settings';

const routes = [
  {
    path: '/embed',
    element: <EmbedPage></EmbedPage>,
  },
  {
    path: '/embed/connections',
    element: <EmbeddedConnectionDialog></EmbeddedConnectionDialog>,
  },
  {
    path: '/authenticate',
    element: <AuthenticatePage />,
  },
  {
    path: '/explore',
    element: (
      <ProjectDashboardLayout>
        <PageTitle title="Explore">
          <ExplorePage />
        </PageTitle>
      </ProjectDashboardLayout>
    ),
  },
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.flows,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_FLOW}>
          <PageTitle title="Flows">
            <FlowsPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleFlow,
    element: (
      <RoutePermissionGuard permission={Permission.READ_FLOW}>
        <PageTitle title="Builder">
          <BuilderNavigationSidebar>
            <FlowBuilderPage />
          </BuilderNavigationSidebar>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectRouterWrapper({
    path: '/flow-import-redirect/:flowId',
    element: <AfterImportFlowRedirect></AfterImportFlowRedirect>,
  }),
  {
    path: '/forms/:flowId',
    element: (
      <PageTitle title="Forms">
        <FormPage />
      </PageTitle>
    ),
  },
  {
    path: '/chats/:flowId',
    element: (
      <PageTitle title="Chats">
        <ChatPage />
      </PageTitle>
    ),
  },
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleRun,
    element: (
      <RoutePermissionGuard permission={Permission.READ_RUN}>
        <PageTitle title="Flow Run">
          <BuilderNavigationSidebar>
            <FlowRunPage />
          </BuilderNavigationSidebar>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.runs,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_RUN}>
          <PageTitle title="Runs">
            <RunsPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),
  {
    path: '/templates/:templateId',
    element: (
      <PageTitle title="Share Template">
        <ShareTemplatePage />
      </PageTitle>
    ),
  },
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleRelease,
    element: (
      <ProjectDashboardLayout>
        <PageTitle title="Releases">
          <ViewRelease />
        </PageTitle>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.tables,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_TABLE}>
          <PageTitle title="Tables">
            <ApTablesPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleTable,
    element: (
      <RoutePermissionGuard permission={Permission.READ_TABLE}>
        <PageTitle title="Table">
          <BuilderNavigationSidebar>
            <ApTableStateProvider>
              <ApTableEditorPage />
            </ApTableStateProvider>
          </BuilderNavigationSidebar>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.connections,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_APP_CONNECTION}>
          <PageTitle title="Connections">
            <AppConnectionsPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.releases,
    element: (
      <ProjectDashboardLayout>
        <PageTitle title="Releases">
          <ProjectReleasesPage />
        </PageTitle>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.todos,
    element: (
      <ProjectDashboardLayout>
        <PageTitle title="Todos">
          <TodosPage />
        </PageTitle>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleTodo,
    element: (
      <PageTitle title="Todo Testing">
        <TodoTestingPage />
      </PageTitle>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.settings,
    element: (
      <ProjectDashboardLayout>
        <SettingsPage />
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: `${routesThatRequireProjectId.settings}/:section`,
    element: (
      <ProjectDashboardLayout>
        <SettingsPage />
      </ProjectDashboardLayout>
    ),
  }),
  {
    path: '/forget-password',
    element: (
      <PageTitle title="Forget Password">
        <ResetPasswordPage />
      </PageTitle>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PageTitle title="Reset Password">
        <ChangePasswordPage />
      </PageTitle>
    ),
  },
  {
    path: '/sign-in',
    element: (
      <PageTitle title="Sign In">
        <SignInPage />
      </PageTitle>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <PageTitle title="Verify Email">
        <VerifyEmail />
      </PageTitle>
    ),
  },
  {
    path: '/sign-up',
    element: (
      <PageTitle title="Sign Up">
        <SignUpPage />
      </PageTitle>
    ),
  },

  ...ProjectRouterWrapper({
    path: '/platform/setup/billing',
    element: (
      <ProjectDashboardLayout>
          <PageTitle title="Billing">
            <BillingPage />
          </PageTitle>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.mcps,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_MCP}>
          <PageTitle title="MCP">
            <McpServersPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.singleMcp,
    element: (
      <ProjectDashboardLayout>
        <RoutePermissionGuard permission={Permission.READ_MCP}>
          <PageTitle title="MCP">
            <McpPage />
          </PageTitle>
        </RoutePermissionGuard>
      </ProjectDashboardLayout>
    ),
  }),

  {
    path: '/invitation',
    element: (
      <PageTitle title="Accept Invitation">
        <AcceptInvitation />
      </PageTitle>
    ),
  },
  {
    path: '/404',
    element: (
      <PageTitle title="Not Found">
        <NotFoundPage />
      </PageTitle>
    ),
  },

  {
    path: '/redirect',
    element: <RedirectPage></RedirectPage>,
  },
  {
    path: '/projects/:projectId',
    element: (
      <TokenCheckerWrapper>
        <DefaultRoute></DefaultRoute>
      </TokenCheckerWrapper>
    ),
  },
  {
    path: '/*',
    element: (
      <PageTitle title="Redirect">
        <DefaultRoute></DefaultRoute>
      </PageTitle>
    ),
  },
];

import { createMemoryRouter, createBrowserRouter } from 'react-router-dom';

const memoryRouter = createMemoryRouter(routes);
const browserRouter = createBrowserRouter(routes);

const ApRouter = () => {
  const { embedState } = useEmbedding();
  const router = embedState.isEmbedded ? memoryRouter : browserRouter;
  return <RouterProvider router={router}></RouterProvider>;
};

export { ApRouter, memoryRouter };
