import React, { useState, useEffect } from 'react';
import { Form, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { FormInput, SubmitBtn } from '../components';

const gridEffect = keyframes`
  0% { background-position: 0px 0px; }
  100% { background-position: 50px 50px; }
`;

const Container = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: 50px 50px;
  animation: ${gridEffect} 20s linear infinite;
`;

const FormContainer = styled(Form)`
  width: 26rem;
  padding: 2.5rem;
  background-color: rgba(10, 10, 10, 0.8);
  border: 2px solid #333;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 255, 170, 0.8),
      transparent
    );
    z-index: 1;
  }
`;

const Title = styled.h4`
  text-align: center;
  font-size: 2.5rem;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
`;

const ButtonContainer = styled.div`
  margin-top: 1.5rem;
`;

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.75rem;
  color: #fff;
`;

const ToggleLabel = styled.label`
  position: relative;
  display: inline-block;
  width: 2.5rem;
  height: 1.2rem;
`;

const ToggleInput = styled.input.attrs({ type: 'checkbox' })`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #00ffaa;
  }
  &:checked + span::before {
    transform: translateX(1.3rem);
  }
`;

const Slider = styled.span`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #444;
  border-radius: 1.2rem;
  transition: 0.3s;

  &::before {
    content: '';
    position: absolute;
    height: 1rem;
    width: 1rem;
    left: 0.1rem;
    bottom: 0.1rem;
    background-color: #fff;
    border-radius: 50%;
    transition: 0.3s;
  }
`;


const UserSettings = () => {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [twoFAEnabled, setTwoFAEnabled] = useState(false);

	useEffect(() => {
		(async () => {
		try {
			const resp = await fetch('http://localhost:8888/user/me', {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user.authToken}`,
				},
			});
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const data = await resp.json();
			// console.log(data)
			setTwoFAEnabled(Number(data.two_fa) === 1);
		} catch (err) {
			console.error('Failed to fetch 2FA status', err);
			toast.error('Could not load 2FA status');
		}
		})();
	}, [user.authToken]);
	// console.log('twoFAEnabled: ', twoFAEnabled)
	
	const handleToggle2FA = () => {
		setTwoFAEnabled(prev => !prev)
	}

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (newPassword && newPassword !== confirmPassword) {
			toast.error('Passwords do not match');
			return null;
		}

		if (newUsername) {
			const alphanumericRegex = /^[a-zA-Z0-9_.!-]+$/;
			if (!alphanumericRegex.test(newUsername)) {
				toast.error(
					"Username must contain only alphanumeric characters and special characters (_, ., !, -).",
				);
				return;
			}
		}
		try {
			const response = await fetch(`http://localhost:8888/user/${user.username}/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user.authToken}`,
				},
				body: JSON.stringify({
					currentPassword,
					newPassword: newPassword || undefined,
					newUsername: newUsername || undefined,
					twoFA: twoFAEnabled ? 1 : 0,
				}),
			});
			if (response.status === 200) {
				toast.success('Your credentials were updated. You will be logged out to re-authenticate.');
				setTimeout(() => {
					logout();
					navigate('/login');
				}, 2000);
			} else {
				const body = await response.json();
				toast.error(body.error || 'Update failed');
			}
		} catch (err: unknown) {
			let errorMessage = 'please double check your credentials';
			if (err instanceof AxiosError && err.message)
				errorMessage = err.message;
			toast.error(errorMessage);
		}
	}
	
	return (
	<Container>
		<FormContainer onSubmit={handleSubmit}>
		<Title>Settings</Title>

		{/* Two-Factor Auth Toggle */}
		<ToggleWrapper>
			<ToggleLabel>
				<ToggleInput
					checked={twoFAEnabled}
					onChange={handleToggle2FA}
				/>
				<Slider />
			</ToggleLabel>
			<span>Two-Factor Authentication</span>
		</ToggleWrapper>

		<FormInput
			type="password"
			label="Current Password"
			name="currentPassword"
			value={currentPassword}
			onChange={e => setCurrentPassword(e.target.value)}
			required
		/>

		<FormInput
			type="text"
			label="New Username (optional)"
			name="newUsername"
			value={newUsername}
			onChange={e => setNewUsername(e.target.value)}
		/>

		<FormInput
			type="password"
			label="New Password (optional)"
			name="newPassword"
			value={newPassword}
			onChange={e => setNewPassword(e.target.value)}
		/>

		<FormInput
			type="password"
			label="Confirm New Password"
			name="confirmPassword"
			value={confirmPassword}
			onChange={e => setConfirmPassword(e.target.value)}
		/>

		<ButtonContainer>
			<SubmitBtn text="Update" />
		</ButtonContainer>
		</FormContainer>
	</Container>
	);
};

export default UserSettings;