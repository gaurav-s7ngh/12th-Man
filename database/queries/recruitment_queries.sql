-- 12th Man Scouting & Recruitment Intelligence Queries

-- 1. Player Per-90 Rollups with Confidence Tiering
SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.primary_position,
    p.nationality,
    COUNT(DISTINCT a.match_id) AS matches_played,
    SUM(s.minutes_played) AS total_minutes,
    CASE 
        WHEN SUM(s.minutes_played) >= 270 THEN 'Sufficient (>270 mins)'
        WHEN SUM(s.minutes_played) >= 90 THEN 'Limited Sample (90-269 mins)'
        ELSE 'Insufficient (<90 mins)'
    END AS sample_confidence,
    ROUND((SUM(s.goals)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS goals_p90,
    ROUND((SUM(s.assists)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS assists_p90,
    ROUND((SUM(s.xg)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS xg_p90,
    ROUND((SUM(s.key_passes)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS key_passes_p90,
    ROUND((SUM(s.tackles)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS tackles_p90,
    ROUND((SUM(s.interceptions)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS interceptions_p90,
    ROUND((SUM(s.dribbles_completed)::numeric / NULLIF(SUM(s.minutes_played), 0) * 90), 2) AS dribbles_p90
FROM players p
JOIN player_match_stats s ON s.player_id = p.id
JOIN player_appearances a ON a.player_id = p.id AND a.match_id = s.match_id
GROUP BY p.id, p.name, p.primary_position, p.nationality
HAVING SUM(s.minutes_played) > 0
ORDER BY total_minutes DESC;

-- 2. Squad Depth & Positional Coverage for Club Linked Team
SELECT
    p.primary_position,
    COUNT(p.id) AS player_count,
    ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date))), 1) AS avg_age,
    SUM(pa.minutes_played) AS total_minutes_played
FROM player_appearances pa
JOIN players p ON p.id = pa.player_id
WHERE pa.team_id = (SELECT linked_team_id FROM clubs LIMIT 1)
GROUP BY p.primary_position
ORDER BY player_count ASC;

-- 3. Cross-Competition Candidate Discovery for Target Profile
SELECT
    p.id,
    p.name,
    p.primary_position,
    c.name AS competition_name,
    se.name AS season_name,
    SUM(pms.minutes_played) AS minutes_played,
    ROUND((SUM(pms.tackles + pms.interceptions)::numeric / NULLIF(SUM(pms.minutes_played), 0) * 90), 2) AS defensive_actions_p90,
    ROUND((SUM(pms.passes_completed)::numeric / NULLIF(SUM(pms.minutes_played), 0) * 90), 2) AS passes_completed_p90
FROM players p
JOIN player_match_stats pms ON pms.player_id = p.id
JOIN matches m ON m.id = pms.match_id
JOIN competitions c ON c.id = m.competition_id
JOIN seasons se ON se.id = m.season_id
GROUP BY p.id, p.name, p.primary_position, c.name, se.name
HAVING SUM(pms.minutes_played) >= 180
ORDER BY defensive_actions_p90 DESC
LIMIT 50;
