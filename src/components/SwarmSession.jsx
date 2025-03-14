import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const SwarmContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
`;

const SessionInfo = styled.div`
  margin-bottom: 2rem;
`;

const QuestionText = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const ParticipantCount = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
`;

const SwarmArena = styled.div`
  position: relative;
  width: 100%;
  height: 600px;
  background-color: #f0f0f0;
  border-radius: 12px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const Option = styled.div`
  position: absolute;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transform: translate(-50%, -50%);
  text-align: center;
  width: 120px;
  z-index: 1;
`;

const Puck = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #3498db;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transform: translate(-50%, -50%);
`;

const UserMagnet = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e74c3c;
  opacity: 0.7;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  z-index: 5;
`;

const ResultsContainer = styled.div`
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const ResultTitle = styled.h3`
  margin-bottom: 1rem;
`;

const BrainpowerMeter = styled.div`
  margin: 1rem 0;
  height: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
`;

const BrainpowerFill = styled.div`
  height: 100%;
  background-color: ${props => {
    if (props.value > 0.8) return '#2ecc71';
    if (props.value > 0.5) return '#f39c12';
    return '#e74c3c';
  }};
  width: ${props => props.value * 100}%;
  transition: width 0.5s ease;
`;

const ResetButton = styled.button`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  z-index: 20;
`;

function SwarmSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const arenaRef = useRef(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [puckPosition, setPuckPosition] = useState({ x: 50, y: 50 });
  const [puckVelocity, setPuckVelocity] = useState({ x: 0, y: 0 });
  const [magnetPosition, setMagnetPosition] = useState({ x: 50, y: 50 });
  const [optionPositions, setOptionPositions] = useState([]);
  const [otherMagnets, setOtherMagnets] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('swarmUserId');
  const physicsIntervalRef = useRef(null);
  const [nearOption, setNearOption] = useState(null); // Index of the nearest option
  const [isSettling, setIsSettling] = useState(false); // Whether the puck is settling on an option
  const [isLocked, setIsLocked] = useState(false); // New state to completely lock the puck


  
  // Calculate relative positions for the options (hexagonal arrangement)
  useEffect(() => {
    if (session) {
      const options = session.options;
      const positions = [];
      
      if (options.length <= 2) {
        // Two options - left and right
        positions.push({ x: 25, y: 50 });
        positions.push({ x: 75, y: 50 });
      } else if (options.length <= 4) {
        // Three or four options - form a square
        positions.push({ x: 25, y: 25 });
        positions.push({ x: 75, y: 25 });
        positions.push({ x: 25, y: 75 });
        positions.push({ x: 75, y: 75 });
      } else {
        // 5 or 6 options - hexagon
        const radius = 35;
        const centerX = 50;
        const centerY = 50;
        
        for (let i = 0; i < options.length; i++) {
          const angle = (i * (2 * Math.PI / options.length)) - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          positions.push({ x, y });
        }
      }
      
      setOptionPositions(positions);
    }
  }, [session]);

  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) throw sessionError;
        
        setSession(sessionData);
        
        // Fetch participants
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionId);
        
        if (participantError) throw participantError;
        
        setParticipants(participantData);
        
        // Check if there's already a result for this session
        const { data: resultData, error: resultError } = await supabase
          .from('results')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();
        
        if (resultError) throw resultError;
        
        if (resultData) {
          setResult(resultData);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
        alert('Error fetching session data. Redirecting to home page.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionData();
  }, [sessionId, navigate]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!sessionId || !userId) return;
    
    // Subscribe to force vectors
    const vectorsChannel = supabase
      .channel('force-vectors')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'force_vectors',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        // Update other magnets
        if (payload.new.user_id !== userId) {
          setOtherMagnets(current => ({
            ...current,
            [payload.new.user_id]: {
              x: payload.new.x,
              y: payload.new.y
            }
          }));
        }
      })
      .subscribe();

    // Subscribe to puck positions
    const puckChannel = supabase
      .channel('puck-positions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'puck_positions',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPuckPosition({
          x: payload.new.x,
          y: payload.new.y
        });
        setPuckVelocity({
          x: payload.new.velocity_x,
          y: payload.new.velocity_y
        });
      })
      .subscribe();
    
    // Subscribe to results
    const resultsChannel = supabase
      .channel('results')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'results',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setResult(payload.new);
      })
      .subscribe();
    
    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(vectorsChannel);
      supabase.removeChannel(puckChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, [sessionId, userId]);

  // Add these modifications to your SwarmSession component

  // 1. Add a function to reset the puck to the center
  const resetPuck = () => {
    setPuckPosition({ x: 50, y: 50 });
    setPuckVelocity({ x: 0, y: 0 });
    
    // Also publish the reset position to the database
    publishPuckPosition({ x: 50, y: 50 }, { x: 0, y: 0 });
  };

  // Modify the physics simulation to better handle boundaries
  useEffect(() => {
    if (!session || result) return;
    
    const MASS = 10;
    const FRICTION = 0.96;
    const FORCE_MULTIPLIER = 0.5;
    const MAX_VELOCITY = 5;
    const OPTION_ATTRACTION = 2.0; // Force coefficient for option attraction
    
    const startPhysicsSimulation = () => {
      physicsIntervalRef.current = setInterval(() => {
        // If puck is locked to an option, skip physics calculations
        if (isLocked) return;
        
        setPuckPosition(currentPos => {
          // If settling or locked, don't update position
          if (isSettling) {
            // If settling but not locked, gradually move to option
            if (nearOption !== null && optionPositions[nearOption]) {
              const option = optionPositions[nearOption];
              return {
                x: currentPos.x * 0.8 + option.x * 0.2, // Faster convergence
                y: currentPos.y * 0.8 + option.y * 0.2
              };
            }
            return currentPos;
          }
          
          setPuckVelocity(currentVel => {
            const newVel = { ...currentVel };
            
            // Apply forces from all magnets
            const forces = { x: 0, y: 0 };
            
            // Add force from current user's magnet
            const dx = magnetPosition.x - currentPos.x;
            const dy = magnetPosition.y - currentPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              forces.x += (dx / distance) * FORCE_MULTIPLIER;
              forces.y += (dy / distance) * FORCE_MULTIPLIER;
            }
            
            // Add forces from other users' magnets
            Object.values(otherMagnets).forEach(magnet => {
              const dx = magnet.x - currentPos.x;
              const dy = magnet.y - currentPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0) {
                forces.x += (dx / distance) * FORCE_MULTIPLIER;
                forces.y += (dy / distance) * FORCE_MULTIPLIER;
              }
            });
            
            // If near an option, add attraction force to it
            if (nearOption !== null && optionPositions[nearOption]) {
              const option = optionPositions[nearOption];
              const dx = option.x - currentPos.x;
              const dy = option.y - currentPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0) {
                forces.x += (dx / distance) * OPTION_ATTRACTION;
                forces.y += (dy / distance) * OPTION_ATTRACTION;
              }
            }
            
            // Calculate acceleration
            const ax = forces.x / MASS;
            const ay = forces.y / MASS;
            
            // Update velocity
            newVel.x = (newVel.x + ax) * FRICTION;
            newVel.y = (newVel.y + ay) * FRICTION;
            
            // Apply velocity cap to prevent extreme speeds
            const velocityMagnitude = Math.sqrt(newVel.x * newVel.x + newVel.y * newVel.y);
            if (velocityMagnitude > MAX_VELOCITY) {
              const scale = MAX_VELOCITY / velocityMagnitude;
              newVel.x *= scale;
              newVel.y *= scale;
            }
            
            return newVel;
          });
          
          // Update position based on velocity
          const newPos = {
            x: currentPos.x + puckVelocity.x,
            y: currentPos.y + puckVelocity.y
          };
          
          // Boundary handling
          if (newPos.x < 5) {
            newPos.x = 5;
            setPuckVelocity(v => ({ ...v, x: Math.abs(v.x) * 0.5 }));
          }
          if (newPos.x > 95) {
            newPos.x = 95;
            setPuckVelocity(v => ({ ...v, x: -Math.abs(v.x) * 0.5 }));
          }
          if (newPos.y < 5) {
            newPos.y = 5;
            setPuckVelocity(v => ({ ...v, y: Math.abs(v.y) * 0.5 }));
          }
          if (newPos.y > 95) {
            newPos.y = 95;
            setPuckVelocity(v => ({ ...v, y: -Math.abs(v.y) * 0.5 }));
          }
          
          // Check if puck is "lost"
          const isLost = 
            newPos.x < 0 || newPos.x > 100 || 
            newPos.y < 0 || newPos.y > 100 ||
            Number.isNaN(newPos.x) || Number.isNaN(newPos.y);
          
          if (isLost) {
            console.log("Puck was lost, resetting to center");
            return { x: 50, y: 50 };
          }
          
          // Check if puck has settled near an option
          checkForDecision(newPos);
          
          // Publish puck position to the database (throttled to save on writes)
          if (Math.random() < 0.1) {
            publishPuckPosition(newPos, puckVelocity);
          }
          
          return newPos;
        });
      }, 33); // ~30 FPS
    };
    
    startPhysicsSimulation();
    
    return () => {
      if (physicsIntervalRef.current) {
        clearInterval(physicsIntervalRef.current);
      }
    };
  }, [session, magnetPosition, otherMagnets, result, nearOption, isSettling, isLocked, optionPositions]);

  // Handle mouse/touch movement
  const handleMouseMove = (e) => {
    if (result) return; // Don't allow movement if the decision is made
    
    const rect = arenaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMagnetPosition({ x, y });
    
    // Publish user magnet position
    publishForceVector(x, y);
  };

  // Publish user's force vector
  const publishForceVector = async (x, y) => {
    if (!sessionId || !userId) return;
    
    try {
      await supabase.from('force_vectors').insert({
        session_id: sessionId,
        user_id: userId,
        x,
        y,
        magnitude: 1.0 // Simplified for now
      });
    } catch (error) {
      console.error('Error publishing force vector:', error);
    }
  };

  // Publish puck position
  const publishPuckPosition = async (position, velocity) => {
    if (!sessionId) return;
    
    try {
      await supabase.from('puck_positions').insert({
        session_id: sessionId,
        x: position.x,
        y: position.y,
        velocity_x: velocity.x,
        velocity_y: velocity.y
      });
    } catch (error) {
      console.error('Error publishing puck position:', error);
    }
  };

  // Update the checkForDecision function
  const checkForDecision = (puckPos) => {
    if (!session || !optionPositions.length || result || isLocked) return;
    
    // Find the closest option
    let closestOptionIndex = -1;
    let minDistance = Infinity;
    
    optionPositions.forEach((option, index) => {
      const dx = option.x - puckPos.x;
      const dy = option.y - puckPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestOptionIndex = index;
      }
    });
    
    // If puck is close enough to an option, begin settling process
    const ATTRACTION_THRESHOLD = 20; // Distance at which option begins attracting puck
    const DECISION_THRESHOLD = 8;    // Distance at which a decision is considered final
    
    if (minDistance < ATTRACTION_THRESHOLD && closestOptionIndex >= 0) {
      setNearOption(closestOptionIndex);
      
      // If very close, start the settling process
      if (minDistance < DECISION_THRESHOLD && !isSettling) {
        setIsSettling(true);
        
        // Immediately lock the puck to the option position
        setIsLocked(true);
        
        // Snap the puck directly to the option's position
        setPuckPosition({
          x: optionPositions[closestOptionIndex].x,
          y: optionPositions[closestOptionIndex].y
        });
        
        // Set velocity to zero
        setPuckVelocity({ x: 0, y: 0 });
        
        // After a short delay, finalize the decision
        setTimeout(() => {
          finalizeDecision(closestOptionIndex, 0); // Distance is 0 since we snapped to option
        }, 1000); // 1 second delay for visual feedback
      }
    } else {
      setNearOption(null);
      setIsSettling(false);
    }
  };

  // Record the final decision
  const finalizeDecision = async (optionIndex, distance) => {
    if (!session || result) return;
    
    // Calculate "brainpower" - a measure of the conviction (0 to 1)
    // Closer to option = higher conviction
    const brainpower = Math.max(0, Math.min(1, 1 - (distance / 30)));
    
    try {
      const { data, error } = await supabase.from('results').insert({
        session_id: sessionId,
        selected_option: session.options[optionIndex],
        brainpower,
        completion_time: 30, // Placeholder value
      }).select();
      
      if (error) throw error;
      
      setResult(data[0]);
      
      // Update session status to completed
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
        
      if (physicsIntervalRef.current) {
        clearInterval(physicsIntervalRef.current);
      }
    } catch (error) {
      console.error('Error finalizing decision:', error);
    }
  };

  if (loading) {
    return <div>Loading session...</div>;
  }

  if (!session) {
    return <div>Session not found.</div>;
  }

  return (
    <SwarmContainer>
      <SessionInfo>
        <h1>{session.title}</h1>
        <QuestionText>{session.question}</QuestionText>
        <ParticipantCount>
          {participants.length} participant{participants.length !== 1 ? 's' : ''} joined
        </ParticipantCount>
      </SessionInfo>
      
      {result ? (
        <ResultsContainer>
          <ResultTitle>The Swarm Has Decided</ResultTitle>
          <h2>{result.selected_option}</h2>
          
          <div>
            <p>Swarm Brainpower:</p>
            <BrainpowerMeter>
              <BrainpowerFill value={result.brainpower} />
            </BrainpowerMeter>
            <p>{Math.round(result.brainpower * 100)}% conviction</p>
          </div>
        </ResultsContainer>
      ) : (
        <SwarmArena 
          ref={arenaRef}
          onMouseMove={handleMouseMove}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMouseMove({
              clientX: touch.clientX,
              clientY: touch.clientY
            });
          }}
        >
          {session.options.map((option, index) => (
            optionPositions[index] && (
              <Option
                key={index}
                style={{
                  left: `${optionPositions[index].x}%`,
                  top: `${optionPositions[index].y}%`
                }}
              >
                {option}
              </Option>
            )
          ))}
          
          <Puck
            style={{
              left: `${puckPosition.x}%`,
              top: `${puckPosition.y}%`
            }}
          />
          
          <UserMagnet
            style={{
              left: `${magnetPosition.x}%`,
              top: `${magnetPosition.y}%`
            }}
          />
          
          <ResetButton onClick={resetPuck}>
            Reset Puck
          </ResetButton>
        </SwarmArena>
      )}
    </SwarmContainer>
  );
}

export default SwarmSession;