import React from 'react';
import {
  Section,
  SectionTitle,
  MatchHistory,
  MatchCard,
  MatchAvatar,
  MatchInfo,
  MatchOpponent,
  MatchResult,
  MatchScore,
  MatchDate,
  EmptyState,
} from '../../pages/UserProfileStyles';

interface Match {
  id: number;
  opponent: string;
  opponentAvatar: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
}

interface MatchHistorySectionProps {
  matches: Match[];
  formatDate: (dateString: string) => string;
}

export const MatchHistorySection: React.FC<MatchHistorySectionProps> = ({
  matches,
  formatDate,
}) => {
  return (
    <Section>
      <SectionTitle>Match History</SectionTitle>
      {matches.length > 0 ? (
        <MatchHistory>
          {matches.map((match) => (
            <MatchCard key={match.id} result={match.result}>
              <MatchAvatar
                src={match.opponentAvatar}
                alt={`${match.opponent}'s avatar`}
              />
              <MatchInfo>
                <MatchOpponent>
                  vs. <strong>{match.opponent}</strong>
                </MatchOpponent>
                <MatchResult result={match.result}>{match.result}</MatchResult>
              </MatchInfo>
              <MatchScore>{match.score}</MatchScore>
              <MatchDate>{formatDate(match.date)}</MatchDate>
            </MatchCard>
          ))}
        </MatchHistory>
      ) : (
        <EmptyState>No matches played yet</EmptyState>
      )}
    </Section>
  );
};
