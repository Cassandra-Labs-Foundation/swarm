import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const JoinSessionContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const SessionCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SessionTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
`;

const SessionStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: ${props => props.status === 'active' ? '#2ecc71' : '#3498db'};
  color: white;
`;

const JoinButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 1rem;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

const NoSessionsMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ParticipantCount = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-top: 0.5rem;
`;

function JoinSession() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState({});

  useEffect(() => {
    fetchSessions();
    
    // Set up real-time subscription for new sessions
    const sessionsSubscription = supabase
      .channel('public:sessions')
      .on('INSERT', (payload) => {
        setSessions(current => [...current, payload.new]);
      })
      .on('UPDATE', (payload) => {
        setSessions(current => 
          current.map(session => 
            session.id === payload.new.id ? payload.new : session
          )
        );
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(sessionsSubscription);
    };
  }, []);

  const fetchSessions = async () => {
    try {
      // Fetch active and pending sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });
      
      if (sessionError) throw sessionError;
      
      setSessions(sessionData);
      
      // Fetch participant counts for each session
      const sessionIds = sessionData.map(session => session.id);
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('session_id, count')
        .in('session_id', sessionIds)
        .group('session_id');
      
      if (participantError) throw participantError;
      
      const participantCounts = {};
      participantData.forEach(item => {
        participantCounts[item.session_id] = item.count;
      });
      
      setParticipants(participantCounts);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (sessionId) => {
    // Check if user already has an ID
    let userId = localStorage.getItem('swarmUserId');
    
    // If not, generate a new one
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('swarmUserId', userId);
    }
    
    try {
      // Add user as a participant
      const { error } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          user_id: userId
        });
      
      if (error) {
        // Check if error is due to unique constraint (user already joined)
        if (error.code === '23505') {
          // User already joined, just navigate
          navigate(`/session/${sessionId}`);
          return;
        }
        throw error;
      }
      
      // Navigate to the session
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Error joining session. Please try again.');
    }
  };

  const getParticipantCount = (sessionId) => {
    return participants[sessionId] || 0;
  };

  if (loading) {
    return <LoadingMessage>Loading available sessions...</LoadingMessage>;
  }

  return (
    <JoinSessionContainer>
      <h2>Join a Swarm Session</h2>
      
      {sessions.length > 0 ? (
        <SessionList>
          {sessions.map(session => (
            <SessionCard key={session.id}>
              <SessionHeader>
                <SessionTitle>{session.title}</SessionTitle>
                <SessionStatus status={session.status}>
                  {session.status === 'active' ? 'Active' : 'Pending'}
                </SessionStatus>
              </SessionHeader>
              
              <div>
                <strong>Question:</strong> {session.question}
              </div>
              
              <ParticipantCount>
                {getParticipantCount(session.id)} participant(s) joined
              </ParticipantCount>
              
              <JoinButton onClick={() => joinSession(session.id)}>
                Join Session
              </JoinButton>
            </SessionCard>
          ))}
        </SessionList>
      ) : (
        <NoSessionsMessage>
          <p>No active swarm sessions found.</p>
          <p>Try creating a new one!</p>
        </NoSessionsMessage>
      )}
    </JoinSessionContainer>
  );
}

export default JoinSession;