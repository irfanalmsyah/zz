import { Box, Chip, FormLabel, Stack } from '@mui/material';
import { colorForIndex } from '../palette.js';

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function TeamColumn({ label, players, selected, otherSelected, onChange, colorIndexById }) {
  return (
    <Box flex={1} minWidth={160}>
      <FormLabel sx={{ display: 'block', mb: 1, fontSize: '0.8rem', fontWeight: 600 }}>{label}</FormLabel>
      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
        {players.map((p) => {
          const active = selected.includes(p.id);
          const color = colorForIndex(colorIndexById.get(p.id) ?? 0);
          return (
            <Chip
              key={p.id}
              label={p.name}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              disabled={otherSelected.includes(p.id)}
              onClick={() => onChange(toggle(selected, p.id))}
              sx={{
                bgcolor: active ? `${color}22` : 'transparent',
                color: active ? color : 'text.primary',
                borderColor: active ? color : 'divider',
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

export default function TeamPicker({ players, team1, team2, onChangeTeam1, onChangeTeam2 }) {
  const colorIndexById = new Map(
    [...players].sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => [p.id, i])
  );

  return (
    <Box display="flex" gap={3} flexWrap="wrap">
      <TeamColumn
        label="Team 1"
        players={players}
        selected={team1}
        otherSelected={team2}
        onChange={onChangeTeam1}
        colorIndexById={colorIndexById}
      />
      <TeamColumn
        label="Team 2"
        players={players}
        selected={team2}
        otherSelected={team1}
        onChange={onChangeTeam2}
        colorIndexById={colorIndexById}
      />
    </Box>
  );
}
