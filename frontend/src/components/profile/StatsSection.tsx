import React from 'react';
import {
	Section,
	SectionTitle,
	StatsGrid,
	StatCard,
	StatLabel,
	StatValue,
} from '../../pages/UserProfileStyles';
import { Stats } from '../../hooks/useStats';

interface StatsSectionProps {
	stats: Stats;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
	return (
		<Section>
			<SectionTitle>Statistics</SectionTitle>
			<StatsGrid>
				<StatCard>
					<StatLabel>Total Matches</StatLabel>
					<StatValue>{stats.totalMatches}</StatValue>
				</StatCard>
				<StatCard>
					<StatLabel>Win Rate</StatLabel>
					<StatValue>{stats.winRate}%</StatValue>
				</StatCard>
				<StatCard>
					<StatLabel>Wins / Losses</StatLabel>
					<StatValue>
						{stats.wins} / {stats.losses}
					</StatValue>
				</StatCard>
				<StatCard>
					<StatLabel>Points Scored</StatLabel>
					<StatValue>{stats.totalScored}</StatValue>
				</StatCard>
				<StatCard>
					<StatLabel>Points Conceded</StatLabel>
					<StatValue>{stats.totalConceded}</StatValue>
				</StatCard>
				<StatCard>
					<StatLabel>Tournaments won</StatLabel>
					<StatValue>{stats.tournamentsWon}</StatValue>
				</StatCard>
			</StatsGrid>
		</Section>
	);
};