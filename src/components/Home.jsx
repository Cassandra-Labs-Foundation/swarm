import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled(Link)`
  padding: 1rem 2rem;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

function Home() {
  return (
    <HomeContainer>
      <h2>Welcome to Swarm Intelligence</h2>
      <p>
        Collaborate in real-time to make decisions as a collective intelligence.
        Based on the principles of Artificial Swarm Intelligence.
      </p>
      <ButtonGroup>
        <Button to="/create">Create a Swarm</Button>
        <Button to="/join">Join a Swarm</Button>
      </ButtonGroup>
    </HomeContainer>
  );
}

export default Home;