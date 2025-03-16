import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorNotification from './ErrorNotification';
import LoadingIndicator from './LoadingIndicator';

const LayoutContainer = styled.div`
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-areas:
      "header header"
      "main main";
    grid-template-columns: 1fr;
    grid-template-rows: 60px 1fr;
  }
`;

const MainContent = styled.main`
  grid-area: main;
  padding: 20px;
  overflow-y: auto;
`;

const Layout: React.FC = () => {
  const { session, isLoading } = useSession();

  // If there's no session and we're not loading, redirect to login
  if (!session && !isLoading) {
    return <Navigate to="/login" />;
  }

  // Show loading indicator while session data is being loaded
  if (isLoading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <LayoutContainer>
      <Header />
      <Sidebar />
      <MainContent>
        <ErrorNotification />
        <Outlet />
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;