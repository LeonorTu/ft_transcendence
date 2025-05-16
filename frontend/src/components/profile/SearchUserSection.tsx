import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { customFetch } from '../../utils';
import { createPortal } from 'react-dom';

// Full-screen overlay
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

// Modal container
const Modal = styled.div`
  position: relative;           // allow absolute child positioning
  background: #222;
  border-radius: 8px;
  padding: 2rem;
  width: 35rem;
  max-width: 95vw;
  max-height: 70vh;
  overflow-y: auto;             // enable internal scrolling
  display: flex;
  flex-direction: column;
`;

// Close button
const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #00ffaa;
  font-size: 1.5rem;
  cursor: pointer;
  &:hover { color: #ff0000; }
`;

const Title = styled.h2`
  margin: 0;
  color: #00ffaa;
  font-family: 'Press Start 2P', cursive;
  font-size: 1.25rem;
`;

const SearchWrapper = styled.div`
  margin-top: 1rem;
  position: relative;
  flex: 0 0 auto;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  font-family: 'Press Start 2P', cursive;
  background-color: black;
  color: #00ffaa;
  border: 2px solid #00ffaa;
  border-radius: 6px;
  outline: none;
`;

const Suggestions = styled.ul`
  position: absolute;
  top: calc(100% + 0.5rem);
  width: 100%;
  background-color: #111;
  border: 1px solid #00ffaa;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 10;
`;

const SuggestionItem = styled.li`
  padding: 0.5rem;
  cursor: pointer;
  color: #00ffaa;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.75rem;
  &:hover { background-color: #00ffaa; color: black; }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 1rem 0 0;
  // keep footer visible when suggestions scroll
  position: sticky;
  bottom: 0;
  background: #222;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  margin-left: 1rem;
  margin-top: 1rem;
  background-color: #00ffaa;
  color: black;
  border: 2px solid #00ffaa;
  border-radius: 6px;
  font-family: 'Press Start 2P', cursive;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover { background-color: black; color: #00ffaa; }
`;

export interface SearchUserProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchUserSection: React.FC<SearchUserProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<typeof users>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    customFetch.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (!query) return setFiltered([]);
    setFiltered(
      users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query, users]);

  const handleSelect = (username: string) => {
    navigate(`/profile/${username}`);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <Overlay>
      <Modal>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>Search & Visit Profile</Title>
        <SearchWrapper>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type username..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {filtered.length > 0 && (
            <Suggestions>
              {filtered.map(u => (
                <SuggestionItem key={u.id} onClick={() => handleSelect(u.username)}>
                  {u.username}
                </SuggestionItem>
              ))}
            </Suggestions>
          )}
        </SearchWrapper>
        <Footer>
          <Button onClick={onClose}>Cancel</Button>
        </Footer>
      </Modal>
    </Overlay>
  );

  // Render via portal to avoid parent transform issues
  return createPortal(modalContent, document.body);
};