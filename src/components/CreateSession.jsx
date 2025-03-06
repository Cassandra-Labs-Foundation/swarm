import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const FormContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 100px;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

const OptionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddOptionButton = styled.button`
  padding: 0.5rem;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

function CreateSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (title.trim() === '' || question.trim() === '') {
      alert('Please fill in all required fields');
      return;
    }
    
    const filteredOptions = options.filter(opt => opt.trim() !== '');
    if (filteredOptions.length < 2) {
      alert('Please provide at least 2 options');
      return;
    }
    
    setLoading(true);
    
    // Generate a random user ID for this session
    const userId = uuidv4();
    
    try {
      // Create a new session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          title,
          question,
          options: filteredOptions,
          status: 'pending'
        })
        .select();
      
      if (sessionError) throw sessionError;
      
      const sessionId = session[0].id;
      
      // Add the creator as a participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          user_id: userId
        });
      
      if (participantError) throw participantError;
      
      // Create initial puck position at center
      const { error: puckError } = await supabase
        .from('puck_positions')
        .insert({
          session_id: sessionId,
          x: 0,
          y: 0
        });
      
      if (puckError) throw puckError;
      
      // Store the user ID in local storage
      localStorage.setItem('swarmUserId', userId);
      
      // Redirect to the session
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <h2>Create a New Swarm</h2>
      <Form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Session Title:</label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="question">Question:</label>
          <TextArea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Options:</label>
          {options.map((option, index) => (
            <OptionContainer key={index}>
              <Input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
            </OptionContainer>
          ))}
          {options.length < 6 && (
            <AddOptionButton type="button" onClick={addOption}>
              Add Option
            </AddOptionButton>
          )}
        </div>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Swarm'}
        </Button>
      </Form>
    </FormContainer>
  );
}

export default CreateSession;