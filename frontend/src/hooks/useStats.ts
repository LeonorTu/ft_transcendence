import { useState, useEffect } from 'react';
import { customFetch } from '../utils';

export interface Stats {
	totalMatches:   number;
	wins:           number;
	losses:         number;
	winRate:        number;    // e.g. 70
	totalScored:    number;
	totalConceded:  number;
	tournamentsWon: number;
}

export const useStats = (userName?: string) => {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(false);
	const [error,   setError]   = useState<string | null>(null);

	useEffect(() => {
		if (!userName) return;

		const fetchStats = async () => {
			setLoading(true);
			try {
				const res = await customFetch.get<Stats>(`/user/${userName}/stats`);
			setStats(res.data);
			} catch (err: any) {
				console.error(err);
				setError(err.message || 'Failed to load stats');
			} finally {
				setLoading(false);
			}
		};

		fetchStats();
	}, [userName]);

	return { stats, loading, error };
};
