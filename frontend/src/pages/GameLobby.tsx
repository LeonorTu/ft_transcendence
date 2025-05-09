import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { customFetch } from '../utils';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

const Container = styled.section`
	height: 100vh;
	width: 100%;
	padding: 2rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	background: linear-gradient(135deg, #000, #111);
`;

const Title = styled.h2`
	font-family: 'Press Start 2P', cursive;
	font-size: 2rem;
	margin-bottom: 2rem;
`;

const Title1 = styled.h3`
	font-family: 'Press Start 2P', cursive;
	font-size: 1.5rem;
	margin-bottom: 2rem;
`;

const MatchList = styled.ul`
	list-style: none;
	padding: 0;
`;

const MatchItem = styled.li`
	padding: 1rem;
	margin: 1rem 0;
	background: #222;
	border-radius: 8px;
	text-align: center;
`;

const NoMatches = styled.div`
	margin-top: 2rem;
	color: #ccc;
	font-size: 1.2rem;
`;

const Loading = styled.div`
	height: 100vh;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #000, #111);
	color: #fff;
	font-size: 1.5rem;
	font-family: 'Press Start 2P', cursive;
`;

const JoinButton = styled.button`
	padding: 0.5rem 1rem;
	background-color: #0f62fe;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-family: 'Press Start 2P', cursive;
	font-size: 0.8rem;
	transition: background-color 0.2s ease;
	margin-left: 20px;

	&:hover {
		background-color: #0353e9;
	}

	&:disabled {
		background-color: #555;
		cursor: not-allowed;
	}
`;

interface MatchLobby {
	id: number;
	creator_id: string;
	player_count: number;
}

const GameLobby: React.FC = () => {
	// 1) state for your matches & loading
	const [matches, setMatches] = useState<MatchLobby[]>([]);
	const [loading, setLoading] = useState(true);

	// 2) fetch on mount
	useEffect(() => {
		const loadMatches = async () => {
			try {
				const response = await customFetch.get<MatchLobby[]>('tournament/1/info');
				console.log(response)
				setMatches(response.data);
			} catch (err: unknown) {
				let msg = 'Failed to load matches';
				if (err instanceof AxiosError && err.message) msg = err.message;
				toast.error(msg);
			} finally {
				// setLoading(false);
				setTimeout(() => setLoading(false), 1000);
			}
		};

		loadMatches();
	}, []); // empty deps = run once on mount

	// const handleJoin = async (matchId: number) => {
	// 	try {
	// 		// Optionally show loading or disable button here
	// 		await customFetch.post(`/matchmaking/${matchId}/join`);
	// 		toast.success(`Joined match #${matchId}`);
	// 		// You might want to redirect or update state here
	// 	} catch (err) {
	// 		let msg = `Failed to join match #${matchId}`;
	// 		if (err instanceof AxiosError && err.message) msg = err.message;
	// 		toast.error(msg);
	// 	}
	// };

	if (loading) return <Loading>Loading matches...</Loading>;

	return (
		<Container>
			<Title>Tournament lobby</Title>
			<Title1>Waiting list</Title1>
			<MatchList>
				{matches.length === 0 ? (
					<NoMatches>No matches found</NoMatches>
				) : (
					matches.map((match) => (
						<MatchItem key={match.id}>
							Player Id: {match.user_id}
							{/* <JoinButton onClick={() => handleJoin(match.id)}>Join</JoinButton> */}
						</MatchItem>
					))
				)}
			</MatchList>
		</Container>
	);
};

export default GameLobby;