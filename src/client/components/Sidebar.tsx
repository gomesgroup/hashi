import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

// Define a prop interface for components that need the 'open' property
interface SidebarProps {
  open?: boolean;
}

const SidebarContainer = styled.aside<SidebarProps>`
  grid-area: sidebar;
  background-color: var(--primary-color);
  color: white;
  padding: 20px 0;
  overflow-y: auto;
  transition: transform 0.3s ease;

  @media (max-width: 768px) {
    position: fixed;
    top: 60px;
    left: 0;
    bottom: 0;
    width: 240px;
    z-index: 999;
    transform: translateX(${props => props.open ? '0' : '-100%'});
    box-shadow: ${props => props.open ? '0 0 10px rgba(0, 0, 0, 0.3)' : 'none'};
  }
`;

const ToggleButton = styled.button`
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MenuItem = styled.li`
  margin-bottom: 5px;
`;

const StyledNavLink = styled(NavLink)`
  display: block;
  padding: 10px 20px;
  text-decoration: none;
  color: white;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    text-decoration: none;
  }

  &.active {
    background-color: rgba(255, 255, 255, 0.2);
    border-left: 4px solid white;
  }
`;

const MenuHeader = styled.div`
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px 20px;
  margin-top: 20px;
  margin-bottom: 5px;
`;

const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setOpen(false);
    }
  };

  return (
    <>
      <SidebarContainer open={open}>
        <MenuList>
          <MenuItem>
            <StyledNavLink to="/" onClick={closeSidebar}>Dashboard</StyledNavLink>
          </MenuItem>
          
          <MenuHeader>Structures</MenuHeader>
          <MenuItem>
            <StyledNavLink to="/structures" onClick={closeSidebar}>View Structures</StyledNavLink>
          </MenuItem>
          <MenuItem>
            <StyledNavLink to="/upload" onClick={closeSidebar}>Upload Structure</StyledNavLink>
          </MenuItem>
          
          <MenuHeader>Visualization</MenuHeader>
          <MenuItem>
            <StyledNavLink to="/viewer" onClick={closeSidebar}>Molecular Viewer</StyledNavLink>
          </MenuItem>
          <MenuItem>
            <StyledNavLink to="/chimerax" onClick={closeSidebar}>ChimeraX Interactive</StyledNavLink>
          </MenuItem>
          <MenuItem>
            <StyledNavLink to="/settings" onClick={closeSidebar}>View Settings</StyledNavLink>
          </MenuItem>
          
          <MenuHeader>Tools</MenuHeader>
          <MenuItem>
            <StyledNavLink to="/measurements" onClick={closeSidebar}>Measurements</StyledNavLink>
          </MenuItem>
          <MenuItem>
            <StyledNavLink to="/manipulation" onClick={closeSidebar}>Manipulation</StyledNavLink>
          </MenuItem>
        </MenuList>
      </SidebarContainer>
      
      <ToggleButton onClick={toggleSidebar}>
        {open ? '×' : '☰'}
      </ToggleButton>
    </>
  );
};

export default Sidebar;